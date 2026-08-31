/**
 * Second-brain Telegram bot receiver (response doc §18).
 *
 *   POST /api/telegram/brain   header X-Telegram-Bot-Api-Secret-Token
 *
 * This is a SECOND bot, separate from the announcement bot in
 * server/_core/notify.ts (TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID), so a message
 * in the announcement group can never become a capture.
 *
 * The rules this file exists to hold:
 *
 *   - Only TELEGRAM_BRAIN_OWNER_ID's private chat is accepted. Everything else
 *     is dropped with a silent 200 so a prober learns nothing.
 *   - Updates are deduped on update_id BEFORE any side effect. Telegram
 *     redelivers anything it considers slow, and a redelivered voice note must
 *     not cost a second download, upload and transcription.
 *   - Voice audio is stored to the PRIVATE R2 prefix before transcription runs,
 *     and a failure anywhere in that chain still files the capture. A recording
 *     is never lost because a transcriber was down.
 *   - Transcripts, captions and forwarded text are UNTRUSTED TEXT. They are
 *     stored as data. Nothing re-prompts on them, nothing executes them, and
 *     nothing in them may set an item's state. Buttons change state; text never
 *     does (response doc 17.2). A forward is marked trust: "external" (17.7).
 *   - `ready` is set by the owner or not at all. The Ready button asks for a
 *     second confirming tap (p: then pc:) and is never offered on an external
 *     item. promoteItem is the only door, and it runs its own gate checks.
 *
 * Logging: update ids, item ids and counts. Never a note body, never the token,
 * never the webhook secret. Error text goes through safeErr() first, because a
 * failed fetch to api.telegram.org puts the bot token in its own message.
 */
import type { Express, Request, Response } from "express";
import express from "express";
import { ENV } from "../_core/env";
import { timingSafeEqualStr, recordWebhookFailure, isWebhookFailureBlocked } from "../_core/security";
import { logger } from "../_core/logger";
import { getDb } from "../db";
import { brainTelegramUpdates } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { transcribe, MAX_AUDIO_BYTES } from "../lib/transcribe";
import * as items from "../lib/brain-items";
import { BRAIN_KINDS, BRAIN_STATES } from "../lib/brain-items";
import type { BrainKind, BrainState } from "../lib/brain-gate";

const log = logger("telegram-brain");

/** Bot API download cap. */
const TG_FILE_LIMIT = 20 * 1024 * 1024;
/**
 * server/storage.ts caps an upload at 10 MB (MAX_UPLOAD_SIZE, not exported).
 * The binding constraint on a capture is therefore that number, not the 12 MB
 * transcription cap and not Telegram's 20 MB. Taking the smallest of the three
 * means an oversize recording is refused with an explanation at the door,
 * rather than downloaded and then dropped by storagePut with a throw.
 */
const MAX_STORE_BYTES = 10 * 1024 * 1024;
export const MAX_CAPTURE_BYTES = Math.min(MAX_AUDIO_BYTES, TG_FILE_LIMIT, MAX_STORE_BYTES);

export interface Deps {
  ownerId: number;
  createItem: typeof items.createItem;
  updateItem: typeof items.updateItem;
  setItemState: typeof items.setItemState;
  promoteItem: typeof items.promoteItem;
  splitItem: typeof items.splitItem;
  summarizeToday: typeof items.summarizeToday;
  answerTriage: typeof items.answerTriage;
  tg: (method: string, payload: Record<string, unknown>) => Promise<unknown>;
  downloadFile: (fileId: string) => Promise<Buffer>;
  transcribe: (buf: Buffer, mime: string) => Promise<string>;
  storagePut: (key: string, buf: Buffer, mime: string) => Promise<unknown>;
  rememberUpdate: (updateId: number) => Promise<boolean>;
}

type Norm =
  | { type: "text"; updateId: number; messageId: number; text: string; forwardedFrom?: string }
  | { type: "voice"; updateId: number; messageId: number; fileId: string; uniqueId: string; mime: string; size?: number }
  | { type: "photo"; updateId: number; messageId: number; fileId: string; uniqueId: string; caption?: string }
  | { type: "callback"; updateId: number; callbackId: string; messageId: number; data: string }
  | { type: "command"; updateId: number; messageId: number; command: string };

/**
 * Error text that is safe to log. Two things must never reach a log line: the
 * bot token, which node's fetch puts in its own error message because it is in
 * the URL, and a note body, which a driver error could in principle carry.
 * Redact anything token-shaped, then cap the length.
 */
export function safeErr(err: unknown): string {
  const name = err instanceof Error ? err.name : "Error";
  const raw = err instanceof Error ? err.message : String(err);
  const scrubbed = raw
    // Telegram tokens look like 1234567890:AA... . No \b before the digits:
    // in a real fetch error the token arrives as ".../bot<id>:<secret>/...",
    // and "bot8394772011" is one word, so a boundary there never matches.
    .replace(/(?:bot)?\d{6,12}:[A-Za-z0-9_-]{20,}/gi, "[redacted]")
    // Any long hex or base64-ish run: webhook secrets, bridge tokens, hashes.
    .replace(/\b[A-Fa-f0-9]{32,}\b/g, "[redacted]")
    .replace(/\b[A-Za-z0-9_-]{40,}\b/g, "[redacted]");
  return `${name}: ${scrubbed}`.slice(0, 200);
}

function fwdName(m: Record<string, any>): string | undefined {
  const o = m.forward_origin;
  if (o?.sender_user) return [o.sender_user.first_name, o.sender_user.last_name].filter(Boolean).join(" ");
  if (o?.sender_user_name) return o.sender_user_name;
  if (o?.chat?.title) return o.chat.title;
  if (o?.sender_chat?.title) return o.sender_chat.title;
  if (m.forward_from) return [m.forward_from.first_name, m.forward_from.last_name].filter(Boolean).join(" ");
  if (m.forward_sender_name) return m.forward_sender_name;
  return undefined;
}

/** Owner check happens here: anything not from the owner's private chat normalizes to null. */
export function normalizeUpdate(u: any, ownerId = ENV.telegramBrainOwnerId): Norm | null {
  const updateId = Number(u?.update_id);
  if (!Number.isFinite(updateId)) return null;
  if (!ownerId) return null;

  if (u.callback_query) {
    const q = u.callback_query;
    if (q.from?.id !== ownerId || q.message?.chat?.type !== "private" || q.message?.chat?.id !== ownerId) return null;
    return {
      type: "callback",
      updateId,
      callbackId: String(q.id),
      messageId: Number(q.message.message_id),
      data: String(q.data ?? ""),
    };
  }

  const m = u.message;
  if (!m || m.from?.id !== ownerId || m.chat?.type !== "private" || m.chat?.id !== ownerId) return null;
  const messageId = Number(m.message_id);
  const forwardedFrom = fwdName(m);

  if (typeof m.text === "string" && m.text.trim()) {
    const text = m.text.trim();
    // A forwarded message that happens to start with "/" is somebody else's
    // text, so it is a capture, not an instruction to this bot.
    if (text.startsWith("/") && !forwardedFrom) {
      return { type: "command", updateId, messageId, command: text.split(/\s+/)[0]!.toLowerCase() };
    }
    return { type: "text", updateId, messageId, text, ...(forwardedFrom ? { forwardedFrom } : {}) };
  }

  if (m.voice || m.audio) {
    const v = m.voice ?? m.audio;
    return {
      type: "voice",
      updateId,
      messageId,
      fileId: String(v.file_id),
      uniqueId: String(v.file_unique_id),
      mime: v.mime_type || "audio/ogg",
      ...(typeof v.file_size === "number" ? { size: v.file_size } : {}),
    };
  }

  // Telegram sends every rendered size; the last one is the largest.
  const photo = Array.isArray(m.photo) && m.photo.length ? m.photo[m.photo.length - 1] : null;
  if (photo) {
    return {
      type: "photo",
      updateId,
      messageId,
      fileId: String(photo.file_id),
      uniqueId: String(photo.file_unique_id),
      ...(m.caption ? { caption: String(m.caption) } : {}),
    };
  }
  if (m.document && /^image\//.test(m.document.mime_type ?? "")) {
    return {
      type: "photo",
      updateId,
      messageId,
      fileId: String(m.document.file_id),
      uniqueId: String(m.document.file_unique_id),
      ...(m.caption ? { caption: String(m.caption) } : {}),
    };
  }
  return null;
}

const KIND_ROW = [
  ["build", "Build"],
  ["create", "Create"],
  ["todo", "To-do"],
  ["ask", "Ask"],
] as const;

type KeyboardItem = { id: number; kind: string; state: string; trust: string };

/** Whatever the item library returns, without re-importing the schema here. */
type ItemRow = Awaited<ReturnType<typeof items.createItem>>;

export function keyboardFor(item: KeyboardItem) {
  const kinds = KIND_ROW.map(([k, label]) => ({
    text: item.kind === k ? `• ${label}` : label,
    callback_data: `k:${item.id}:${k}`,
  }));
  const actions: Array<{ text: string; callback_data: string }> = [];
  // The gate, expressed as a button that is simply absent: an external-trust
  // item is never one tap from ready, whatever its state.
  if (item.trust !== "external" && ["shaped", "raw"].includes(item.state)) {
    actions.push({ text: "Ready", callback_data: `p:${item.id}` });
  }
  actions.push({ text: "Split", callback_data: `x:${item.id}` }, { text: "Park", callback_data: `s:${item.id}:parked` });
  if (item.state !== "done") actions.push({ text: "Done", callback_data: `s:${item.id}:done` });
  return { inline_keyboard: [kinds, actions] };
}

/**
 * The "probably done" row (ADDENDUM-1 item 2). Three answers, one tap each,
 * same `op:id:arg` shape every other button here uses. `t` is the only free
 * opcode: k, s, p, pc, pn and x are taken.
 *
 * No Ready button and no state names in the labels. This row asks one question
 * about the past, and the only reachable state from it is `done`.
 */
export function triageKeyboardFor(item: { id: number }) {
  return {
    inline_keyboard: [[
      { text: "Done", callback_data: `t:${item.id}:done` },
      { text: "Still open", callback_data: `t:${item.id}:open` },
      { text: "Not sure", callback_data: `t:${item.id}:unsure` },
    ]],
  };
}

/** What a triage answer says back, so the tap is acknowledged in Rye's words. */
const TRIAGE_ACK: Record<items.TriageAnswer, string> = {
  done: "archived",
  open: "still open",
  unsure: "back in a week",
};

function line(item: { id: number; kind: string; state: string; title: string }) {
  return `#${item.id} · ${item.kind} · ${item.state}\n${item.title}`;
}

/** Text for the morning message and for /today. Pure, so it is testable. */
export function todayText(t: items.TodaySummary): string {
  const due = t.due.slice(0, 5).map((i) => `• #${i.id} ${i.title}`).join("\n") || "nothing due";
  return `Today\n${due}\n\n${t.raw} to shape · ${t.ready} ready · ${t.inFlight} in flight · ${t.claimed} claimed done`;
}

/**
 * Owner → the item waiting for its second half. In-memory on purpose: it is one
 * user, the window is ten minutes, and losing it on a redeploy costs a tap.
 */
const pendingSplit = new Map<number, { itemId: number; until: number }>();

const isKind = (v: string): v is BrainKind => (BRAIN_KINDS as readonly string[]).includes(v);
const isState = (v: string): v is BrainState => (BRAIN_STATES as readonly string[]).includes(v);

async function handleCallback(n: Extract<Norm, { type: "callback" }>, d: Deps): Promise<void> {
  const chat_id = d.ownerId;
  const [op, idStr, arg] = n.data.split(":");
  const id = Number(idStr);
  const ack = (text: string) => d.tg("answerCallbackQuery", { callback_query_id: n.callbackId, text });
  if (!Number.isFinite(id)) {
    await ack("?");
    return;
  }
  try {
    if (op === "k") {
      // callback_data is owner-only by the time we are here, but a typo must
      // still not reach the database as an enum value.
      if (!arg || !isKind(arg)) {
        await ack("unknown kind");
        return;
      }
      const item = await d.updateItem(d.ownerId, { id, kind: arg }, "telegram");
      await ack(arg);
      await d.tg("editMessageReplyMarkup", { chat_id, message_id: n.messageId, reply_markup: keyboardFor(item) });
    } else if (op === "s") {
      if (!arg || !isState(arg)) {
        await ack("unknown state");
        return;
      }
      const item = await d.setItemState(d.ownerId, id, arg, "telegram");
      await ack(item.state);
      await d.tg("editMessageReplyMarkup", { chat_id, message_id: n.messageId, reply_markup: keyboardFor(item) });
    } else if (op === "p") {
      // One tap opens the question; only the second tap promotes.
      await ack("confirm below");
      await d.tg("sendMessage", {
        chat_id,
        text: `Promote #${id} to ready? Sessions may pick it up after this.`,
        reply_markup: {
          inline_keyboard: [[
            { text: "Yes, ready", callback_data: `pc:${id}` },
            { text: "No", callback_data: `pn:${id}` },
          ]],
        },
      });
    } else if (op === "pc") {
      const item = await d.promoteItem(d.ownerId, id, "telegram");
      await ack("ready");
      await d.tg("sendMessage", { chat_id, text: `#${id} is ready.`, reply_markup: keyboardFor(item) });
    } else if (op === "pn") {
      await ack("left as is");
    } else if (op === "t") {
      // The triage answer. `arg` is owner-supplied callback data, so it is
      // checked against the three literals before it reaches the database.
      if (arg !== "done" && arg !== "open" && arg !== "unsure") {
        await ack("unknown answer");
        return;
      }
      await d.answerTriage(d.ownerId, id, arg, "telegram");
      // Acknowledge and stop. Deliberately NO editMessageReplyMarkup: one
      // morning message carries up to five triage questions in one keyboard,
      // and editing its markup from a single answer would wipe the other four.
      // A second tap is safe instead: answering `done` twice returns the item
      // unchanged and writes no second `state:done`, so the week's count cannot
      // be inflated by a fat finger.
      await ack(TRIAGE_ACK[arg]);
    } else if (op === "x") {
      pendingSplit.set(d.ownerId, { itemId: id, until: Date.now() + 10 * 60_000 });
      await ack("send the second half");
      await d.tg("sendMessage", { chat_id, text: `Send the second half of #${id} as a new message and I'll link it.` });
    } else {
      // Always answer, or the button spins on Rye's phone until it times out.
      await ack("?");
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "failed";
    // The gate's blockers arrive here ("missing ask; missing done_when"), and
    // they are written to be read, so they go straight back to the tap.
    await ack(message.slice(0, 190));
  }
}

export async function handleTelegramUpdate(u: unknown, d: Deps): Promise<void> {
  const n = normalizeUpdate(u, d.ownerId);
  if (!n) return;
  // Before any side effect: a redelivered voice note must not be downloaded,
  // stored and transcribed a second time.
  if (!(await d.rememberUpdate(n.updateId))) return;
  const chat_id = d.ownerId;

  if (n.type === "command") {
    if (n.command === "/today") {
      const t = await d.summarizeToday(d.ownerId);
      await d.tg("sendMessage", { chat_id, text: todayText(t) });
    } else {
      await d.tg("sendMessage", {
        chat_id,
        text: "Talk, send a voice note, a screenshot, or forward anything. I file it and give you buttons. /today for the summary.",
      });
    }
    return;
  }

  if (n.type === "callback") {
    await handleCallback(n, d);
    return;
  }

  // ── Captures ────────────────────────────────────────────────────────────────
  let body = "";
  let attachments: string[] = [];
  let kind: BrainKind | undefined;
  let proposed: Record<string, unknown> | undefined;
  let trust: "owner" | "external" | undefined;

  if (n.type === "text") {
    body = n.forwardedFrom ? `Forwarded from ${n.forwardedFrom}:\n${n.text}` : n.text;
    if (n.forwardedFrom) {
      // Somebody else's words. The gate refuses to promote an external item
      // until Rye has rewritten the ask himself.
      proposed = { forwarded_from: n.forwardedFrom, tier_hint: "reference" };
      trust = "external";
    }
  } else if (n.type === "voice") {
    if (n.size && n.size > MAX_CAPTURE_BYTES) {
      await d.tg("sendMessage", {
        chat_id,
        text: `That recording is over ${Math.floor(MAX_CAPTURE_BYTES / 1024 / 1024)} MB, past what I can store. Send it in two parts.`,
      });
      return;
    }
    const key = `harvest/voice/${d.ownerId}/tg-${n.uniqueId}.ogg`;
    let buf: Buffer | null = null;
    try {
      buf = await d.downloadFile(n.fileId);
    } catch (err) {
      log.warn(`voice download failed update=${n.updateId}: ${safeErr(err)}`);
    }
    if (!buf) {
      body = "[voice note, audio could not be fetched from Telegram; it is still in this chat]";
    } else {
      // Store first. A transcriber that is down must not cost the recording.
      try {
        await d.storagePut(key, buf, "audio/ogg");
        attachments = [key];
      } catch (err) {
        log.error(`voice store failed update=${n.updateId}: ${safeErr(err)}`);
      }
      try {
        body = await d.transcribe(buf, "audio/ogg");
      } catch (err) {
        log.warn(`transcription failed update=${n.updateId}: ${safeErr(err)}`);
        body = "";
      }
      if (!body.trim()) {
        body = attachments.length
          ? "[voice note, transcription failed; audio kept]"
          : "[voice note, transcription failed and audio could not be stored; it is still in this chat]";
      } else if (!attachments.length) {
        body = `${body}\n\n[audio could not be stored; the recording is still in this Telegram chat]`;
      }
    }
  } else {
    const key = `harvest/shots/${d.ownerId}/tg-${n.uniqueId}.jpg`;
    let buf: Buffer | null = null;
    try {
      buf = await d.downloadFile(n.fileId);
    } catch (err) {
      log.warn(`photo download failed update=${n.updateId}: ${safeErr(err)}`);
    }
    if (buf) {
      try {
        await d.storagePut(key, buf, "image/jpeg");
        attachments = [key];
      } catch (err) {
        log.error(`photo store failed update=${n.updateId}: ${safeErr(err)}`);
      }
    }
    // The caption is untrusted text: it becomes the body and nothing else.
    body = n.caption?.trim() || "[screenshot]";
    if (!attachments.length) body = `${body}\n\n[image could not be stored; it is still in this Telegram chat]`;
    kind = "build";
  }

  const split = pendingSplit.get(d.ownerId);
  const followsId = split && split.until > Date.now() ? split.itemId : undefined;
  if (split) pendingSplit.delete(d.ownerId);

  let item: ItemRow;
  if (followsId !== undefined && n.type === "text") {
    // splitItem is the library's own second-half path: it copies the first
    // item's attachments, which createItem with followsId would not.
    const [, second] = await d.splitItem(d.ownerId, followsId, body, "telegram");
    item = second;
  } else {
    item = await d.createItem(
      d.ownerId,
      {
        body,
        source: `telegram:${d.ownerId}:${n.messageId}`,
        attachments,
        ...(kind ? { kind } : {}),
        ...(followsId !== undefined ? { followsId } : {}),
        ...(proposed ? { proposed } : {}),
        ...(trust ? { trust } : {}),
      },
      "telegram",
    );
  }

  const echo = n.type === "voice" ? `\n\n"${body.slice(0, 300)}${body.length > 300 ? "..." : ""}"` : "";
  await d.tg("sendMessage", {
    chat_id,
    text: `${line(item)}${echo}`,
    reply_markup: keyboardFor(item),
  });
  log.info(`captured item=${item.id} type=${n.type} update=${n.updateId} attachments=${attachments.length}`);
}

// ── Express wiring ─────────────────────────────────────────────────────────────

export function tgClient(token: string) {
  return async (method: string, payload: Record<string, unknown>) => {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 15_000);
    try {
      const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });
      if (!res.ok) log.warn(`telegram ${method} -> ${res.status}`);
      return await res.json().catch(() => ({}));
    } finally {
      clearTimeout(t);
    }
  };
}

function fileDownloader(token: string) {
  return async (fileId: string): Promise<Buffer> => {
    const meta = (await fetch(
      `https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`,
    ).then((r) => r.json())) as { result?: { file_path?: string } };
    const path = meta?.result?.file_path;
    if (!path) throw new Error("getFile failed");
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${path}`);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_CAPTURE_BYTES) throw new Error("file too large");
    return buf;
  };
}

/**
 * True the first time this update_id is seen. Fails CLOSED: if the dedupe table
 * is missing or the database is down we drop the update rather than risk
 * running its side effects twice. `brain_telegram_updates` ships in migration
 * 0230; until that is applied the bot answers nothing, which is the loud
 * version of this failure and the one worth having.
 */
async function rememberUpdate(updateId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    log.error(`dedupe unavailable (no database); dropping update=${updateId}`);
    return false;
  }
  try {
    await db.insert(brainTelegramUpdates).values({ updateId });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (/ER_DUP_ENTRY|Duplicate/i.test(message)) return false;
    log.error(
      `dedupe write failed, dropping update=${updateId} (is drizzle/0230_brain_items.sql applied?): ${safeErr(err)}`,
    );
    return false;
  }
}

/** Deps wired to the real library, the real bot and the real storage. */
export function liveDeps(): Deps {
  return {
    ownerId: ENV.telegramBrainOwnerId,
    createItem: items.createItem,
    updateItem: items.updateItem,
    setItemState: items.setItemState,
    promoteItem: items.promoteItem,
    splitItem: items.splitItem,
    summarizeToday: items.summarizeToday,
    answerTriage: items.answerTriage,
    tg: tgClient(ENV.telegramBrainBotToken),
    downloadFile: fileDownloader(ENV.telegramBrainBotToken),
    transcribe,
    storagePut,
    rememberUpdate,
  };
}

/** True when all three variables are set; the bot is inert otherwise. */
export function telegramBrainConfigured(): boolean {
  return Boolean(ENV.telegramBrainBotToken && ENV.telegramBrainOwnerId && ENV.telegramBrainWebhookSecret);
}

/**
 * Send the owner a message through the brain bot. Used by the morning
 * automation. No-ops when the bot is not configured, so a missing variable
 * degrades a notification rather than failing a cron run.
 */
export async function notifyOwner(text: string, replyMarkup?: Record<string, unknown>): Promise<boolean> {
  if (!telegramBrainConfigured()) {
    log.warn("notifyOwner skipped: telegram brain bot not configured");
    return false;
  }
  try {
    await tgClient(ENV.telegramBrainBotToken)("sendMessage", {
      chat_id: ENV.telegramBrainOwnerId,
      text,
      ...(replyMarkup ? { reply_markup: replyMarkup } : {}),
    });
    return true;
  } catch (err) {
    log.error(`notifyOwner failed: ${safeErr(err)}`);
    return false;
  }
}

export function registerTelegramBrainRoutes(app: Express) {
  // express.json is local to this route so the raw-body webhooks elsewhere are
  // untouched. 1 MB is generous: a photo update carries metadata, not bytes.
  app.post("/api/telegram/brain", express.json({ limit: "1mb" }), async (req: Request, res: Response) => {
    const ip = req.ip || "unknown";
    if (await isWebhookFailureBlocked(ip, "telegram-brain")) {
      return res.status(429).json({ error: "too_many_failures" });
    }
    if (!telegramBrainConfigured()) {
      // Generic body so a prober cannot tell "unset" from "wrong secret".
      return res.status(503).json({ error: "unavailable" });
    }
    const header = String(req.headers["x-telegram-bot-api-secret-token"] ?? "");
    if (!timingSafeEqualStr(header, ENV.telegramBrainWebhookSecret)) {
      await recordWebhookFailure(ip, "telegram-brain");
      log.warn(`auth failure ip=${ip}`);
      return res.status(401).json({ error: "unauthorized" });
    }
    // Acknowledge first: Telegram retries anything slower than its patience,
    // and the dedupe row is already the guard against a redelivery.
    res.status(200).json({ ok: true });
    handleTelegramUpdate(req.body, liveDeps()).catch((err) => log.error(`update failed: ${safeErr(err)}`));
  });
}
