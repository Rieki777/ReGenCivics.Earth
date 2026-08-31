/**
 * Register the second-brain Telegram bot's webhook. One-time, and only AFTER
 * the deploy that carries server/webhooks/telegram-brain.ts is green.
 *
 * Run with the service's variables injected:
 *   railway run -s "ReGenCivics.Earth" npx tsx scripts/telegram-brain-set-webhook.ts
 *
 * Flags:
 *   --url=https://...   override the base url (default PUBLIC_BASE_URL, then
 *                       APP_URL, then https://regencivics.earth)
 *   --force             register even if the pre-flight says the handler is
 *                       not live yet
 *   --unset             delete the webhook instead of registering one
 *
 * Pre-flight, because pointing a live bot at a url that does not answer is how
 * captures get silently dropped: this POSTs the endpoint with NO secret and
 * reads the status code.
 *
 *   401  the handler is deployed and configured. Safe to register.
 *   503  the handler is deployed but at least one of the three
 *        TELEGRAM_BRAIN_* variables has not reached the running service. They
 *        were set with --skip-deploys, so they arrive on the next deploy.
 *   404  the handler is not deployed yet. Ship first.
 *
 * One unauthenticated probe is deliberate and cheap: the endpoint's failure
 * limiter allows five per minute per ip.
 *
 * Nothing here prints the token or the secret. Lengths only.
 */
const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const value = (name: string): string | undefined =>
  args.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const token = process.env.TELEGRAM_BRAIN_BOT_TOKEN ?? "";
const secret = process.env.TELEGRAM_BRAIN_WEBHOOK_SECRET ?? "";
const base = (value("url") ?? process.env.PUBLIC_BASE_URL ?? process.env.APP_URL ?? "https://regencivics.earth").replace(/\/+$/, "");
const hookUrl = `${base}/api/telegram/brain`;

if (!token || !secret) {
  console.error("TELEGRAM_BRAIN_BOT_TOKEN and TELEGRAM_BRAIN_WEBHOOK_SECRET are required.");
  console.error('Run through the service that has them: railway run -s "ReGenCivics.Earth" npx tsx scripts/telegram-brain-set-webhook.ts');
  process.exit(1);
}

type TgResult = { ok?: boolean; description?: string; result?: Record<string, unknown> };

async function api(method: string, body?: unknown): Promise<TgResult> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return (await res.json()) as TgResult;
}

async function preflight(): Promise<number | null> {
  try {
    const res = await fetch(hookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ update_id: 0 }),
    });
    return res.status;
  } catch (err) {
    console.error(`pre-flight could not reach ${hookUrl}: ${(err as Error).message}`);
    return null;
  }
}

async function main(): Promise<void> {
  console.log(`token ${token.length} chars, secret ${secret.length} chars, target ${hookUrl}`);

  if (flag("unset")) {
    const gone = await api("deleteWebhook", { drop_pending_updates: false });
    console.log("deleteWebhook:", gone.ok, gone.description ?? "");
    return;
  }

  const status = await preflight();
  console.log(`pre-flight: POST ${hookUrl} (no secret) -> ${status ?? "unreachable"}`);
  if (status !== 401 && !flag("force")) {
    if (status === 503) {
      console.error("The handler is live but its variables are not. Redeploy ReGenCivics.Earth, then run this again.");
    } else if (status === 404) {
      console.error("No handler at that url. Ship the deploy that carries server/webhooks/telegram-brain.ts first.");
    } else {
      console.error("Expected 401 from an unauthenticated probe. Pass --force only if you know why it differs.");
    }
    process.exit(2);
  }

  const set = await api("setWebhook", {
    url: hookUrl,
    secret_token: secret,
    allowed_updates: ["message", "callback_query"],
    drop_pending_updates: true,
    max_connections: 4,
  });
  console.log("setWebhook:", set.ok, set.description ?? "");
  if (!set.ok) process.exit(3);

  const cmds = await api("setMyCommands", {
    commands: [
      { command: "today", description: "What is due, ready, in flight" },
      { command: "start", description: "How to use this bot" },
    ],
  });
  console.log("setMyCommands:", cmds.ok, cmds.description ?? "");

  const info = await api("getWebhookInfo");
  const r = (info.result ?? {}) as Record<string, unknown>;
  console.log(
    "url:", r.url,
    "| pending:", r.pending_update_count,
    "| last_error:", r.last_error_message ?? "none",
  );
  console.log("Now send the bot a text and a voice note and confirm two items appear in brain.list.");
  console.log("If nothing arrives, check that drizzle/0230_brain_items.sql is applied: the receiver drops every");
  console.log("update when it cannot write its dedupe row, and brain_telegram_updates ships in that migration.");
}

main().catch((err) => {
  // Never print the raw message: a failed fetch to api.telegram.org carries the
  // token in its own error text, because the token is in the url.
  console.error("failed:", (err as Error).name);
  process.exit(1);
});
