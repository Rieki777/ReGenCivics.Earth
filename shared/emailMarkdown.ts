/**
 * Markdown to email-safe HTML.
 *
 * Admin composers write markdown. Resend needs inline-styled HTML. This
 * converter is the only path between those two, so the preview and the
 * sent email stay the same. Merge tokens like {{name}} pass through
 * unescaped so per-recipient substitution still works after conversion.
 */

import type { LetterLayout } from "./letterLayout";

const MERGE_TOKEN = /\{\{[a-zA-Z0-9_]+\}\}/g;

const P = "color:#333;line-height:1.6;margin:0 0 12px 0;";
const H = "color:#1a472a;margin:20px 0 10px 0;font-family:Georgia,serif;";
const LI = "color:#333;line-height:1.8;margin:0 0 4px 0;";
const A = "color:#4a7c59;";
const QUOTE = "color:#333;line-height:1.6;margin:0 0 12px 0;padding-left:14px;border-left:3px solid #4a7c59;";
const CODE = "font-family:ui-monospace,monospace;font-size:0.9em;background:#f0ebe3;padding:1px 4px;border-radius:3px;";

const LINK_ONLY = /^\[([^\]]+)\]\(([^)]+)\)$/;
const BARE_URL = /^(https?:\/\/[^\s]+)$/i;
const IMPORTANT_LINE = /^(?:\*\*Important:?\*\*|Important:)\s*/i;

export type LetterListNode = {
  ordered: boolean;
  items: Array<{ text: string; children?: LetterListNode }>;
};

export type LetterBlock =
  | { type: "p"; text: string }
  | { type: "h"; level: 1 | 2 | 3; text: string }
  | { type: "list"; node: LetterListNode }
  | { type: "quote"; text: string }
  | { type: "callout"; text: string }
  | { type: "hr" }
  | { type: "cta"; label: string; href: string };

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function protectMerges(src: string): { text: string; slots: string[] } {
  const slots: string[] = [];
  const text = src.replace(MERGE_TOKEN, (m) => {
    slots.push(m);
    return `%%MERGE${slots.length - 1}%%`;
  });
  return { text, slots };
}

function restoreMerges(html: string, slots: string[]): string {
  return html.replace(/%%MERGE(\d+)%%/g, (_, i) => slots[Number(i)] ?? "");
}

export function safeHref(raw: string): string | null {
  const href = raw.trim().replace(/&amp;/g, "&");
  if (MERGE_TOKEN.test(href) || /^%%MERGE\d+%%$/.test(href)) return href;
  try {
    const parsed = new URL(href, "https://regencivics.earth");
    if (!["http:", "https:", "mailto:"].includes(parsed.protocol)) return null;
    return href;
  } catch {
    return null;
  }
}

export function inlineFormat(raw: string): string {
  const { text, slots } = protectMerges(raw);
  let s = escapeHtml(text);

  s = s.replace(/`([^`]+)`/g, `<code style="${CODE}">$1</code>`);
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_m, label: string, href: string) => {
    const safe = safeHref(href);
    if (!safe) return label;
    return `<a href="${escapeHtml(safe)}" style="${A}">${label}</a>`;
  });
  s = s.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^\*])\*([^*\n]+)\*/g, `$1<em>$2</em>`);

  return restoreMerges(s, slots);
}

export function markdownInlineToPlain(raw: string): string {
  const { text, slots } = protectMerges(raw);
  let s = text;
  s = s.replace(/`([^`]+)`/g, "$1");
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1");
  s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  s = s.replace(/(^|[^\*])\*([^*\n]+)\*/g, "$1$2");
  return restoreMerges(s, slots);
}

function parseListLine(line: string): { indent: number; ordered: boolean; text: string } | null {
  if (/^(\s*)(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) return null;
  const m = line.match(/^([ \t]*)([-*]|\d+\.) (.+)$/);
  if (!m) return null;
  const indent = m[1].replace(/\t/g, "  ").length;
  return { indent, ordered: /^\d+\./.test(m[2]), text: m[3] };
}

function parseCtaLine(trimmed: string): { label: string; href: string } | null {
  const linked = trimmed.match(LINK_ONLY);
  if (linked) {
    const href = safeHref(linked[2]);
    if (!href) return null;
    return { label: linked[1].trim() || "Open link", href };
  }
  if (BARE_URL.test(trimmed)) {
    const href = safeHref(trimmed);
    if (!href) return null;
    return { label: labelFromUrl(href), href };
  }
  return null;
}

function labelFromUrl(href: string): string {
  try {
    const u = new URL(href);
    if (u.hostname.includes("calendly.com")) return "Schedule a call";
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "Open link";
  }
}

type ListFrame = { indent: number; ordered: boolean; items: LetterListNode["items"] };

function emitOpenList(stack: ListFrame[]): LetterBlock | null {
  if (stack.length === 0) return null;
  while (stack.length > 1) stack.pop();
  const root = stack.pop();
  if (!root || root.items.length === 0) return null;
  return { type: "list", node: { ordered: root.ordered, items: root.items } };
}

function pushListItem(stack: ListFrame[], indent: number, ordered: boolean, text: string): LetterBlock[] {
  const extra: LetterBlock[] = [];

  if (stack.length === 0) {
    stack.push({ indent, ordered, items: [{ text }] });
    return extra;
  }

  const top = stack[stack.length - 1];

  if (indent > top.indent) {
    const parentItem = top.items[top.items.length - 1];
    if (!parentItem) {
      stack.push({ indent, ordered, items: [{ text }] });
      return extra;
    }
    const child: LetterListNode = { ordered, items: [{ text }] };
    parentItem.children = child;
    stack.push({ indent, ordered, items: child.items });
    return extra;
  }

  while (stack.length > 1 && indent < stack[stack.length - 1].indent) {
    stack.pop();
  }

  const current = stack[stack.length - 1];
  if (indent === current.indent && ordered !== current.ordered) {
    const closed = emitOpenList(stack);
    if (closed) extra.push(closed);
    stack.push({ indent, ordered, items: [{ text }] });
    return extra;
  }

  current.items.push({ text });
  return extra;
}

/**
 * Parse a markdown email body into layout-agnostic blocks.
 */
export function parseLetterBlocks(markdown: string): LetterBlock[] {
  const src = (markdown ?? "").replace(/\r\n/g, "\n").trim();
  if (!src) return [];

  const lines = src.split("\n");
  const out: LetterBlock[] = [];
  const para: string[] = [];
  const stack: ListFrame[] = [];

  const endList = () => {
    const block = emitOpenList(stack);
    if (block) out.push(block);
  };

  const endPara = () => {
    const text = para.join(" ").trim();
    para.length = 0;
    if (!text) return;
    if (IMPORTANT_LINE.test(text)) {
      out.push({ type: "callout", text });
      return;
    }
    out.push({ type: "p", text });
  };

  for (const line of lines) {
    const trimmed = line.trim();
    const list = parseListLine(line);
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);
    const cta = trimmed ? parseCtaLine(trimmed) : null;

    if (list) {
      endPara();
      out.push(...pushListItem(stack, list.indent, list.ordered, list.text));
      continue;
    }

    endList();

    if (!trimmed) {
      endPara();
      continue;
    }

    if (cta) {
      endPara();
      out.push({ type: "cta", label: cta.label, href: cta.href });
      continue;
    }

    if (heading) {
      endPara();
      const level = heading[1].length as 1 | 2 | 3;
      out.push({ type: "h", level, text: heading[2] });
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      endPara();
      out.push({ type: "hr" });
      continue;
    }

    if (trimmed.startsWith("> ")) {
      endPara();
      out.push({ type: "quote", text: trimmed.slice(2) });
      continue;
    }

    para.push(trimmed);
  }

  endList();
  endPara();
  return out;
}

function renderCtaButton(label: string, href: string): string {
  const safe = safeHref(href);
  if (!safe) return `<p style="${P}">${inlineFormat(label)}</p>`;
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 16px auto;"><tr><td align="center" bgcolor="#4a7c59" style="border-radius:6px;"><a href="${escapeHtml(safe)}" style="display:inline-block;padding:12px 28px;color:#ffffff;text-decoration:none;font-weight:bold;font-family:Georgia,'Times New Roman',serif;font-size:15px;">${escapeHtml(label)}</a></td></tr></table>`;
}

function renderCallout(text: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 16px 0;"><tr><td style="background:#f0f7f0;border-left:4px solid #4a7c59;padding:14px 16px;"><p style="color:#1a472a;line-height:1.6;margin:0;">${inlineFormat(text)}</p></td></tr></table>`;
}

function renderList(node: LetterListNode): string {
  const tag = node.ordered ? "ol" : "ul";
  const lis = node.items
    .map((item) => {
      const child = item.children ? renderList(item.children) : "";
      return `<li style="${LI}">${inlineFormat(item.text)}${child}</li>`;
    })
    .join("");
  return `<${tag} style="margin:0 0 12px 18px;padding:0;">${lis}</${tag}>`;
}

function renderCtaPlain(label: string, href: string): string {
  const safe = safeHref(href);
  if (!safe) return `<p style="${P}">${inlineFormat(label)}</p>`;
  return `<p style="${P}"><a href="${escapeHtml(safe)}" style="${A}">${escapeHtml(label)}</a></p>`;
}

/**
 * Render parsed blocks to inner HTML (no outer chrome, no signature).
 * Announcement / one-pager turn standalone links into buttons and quotes into callouts.
 */
export function renderLetterInnerHtml(blocks: LetterBlock[], layout: LetterLayout = "plain"): string {
  const graphic = layout !== "plain";
  return blocks
    .map((block) => {
      switch (block.type) {
        case "p":
          return `<p style="${P}">${inlineFormat(block.text)}</p>`;
        case "h": {
          const tag = block.level === 1 ? "h1" : block.level === 2 ? "h2" : "h3";
          const size = block.level === 1 ? "22px" : block.level === 2 ? "18px" : "16px";
          return `<${tag} style="${H}font-size:${size};">${inlineFormat(block.text)}</${tag}>`;
        }
        case "list":
          return renderList(block.node);
        case "quote":
          return graphic ? renderCallout(block.text) : `<blockquote style="${QUOTE}">${inlineFormat(block.text)}</blockquote>`;
        case "callout":
          return graphic ? renderCallout(block.text) : `<p style="${P}">${inlineFormat(block.text)}</p>`;
        case "hr":
          return '<hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;" />';
        case "cta":
          return graphic ? renderCtaButton(block.label, block.href) : renderCtaPlain(block.label, block.href);
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join("");
}

/**
 * Convert a markdown email body to inner HTML (no outer wrapper, no signature).
 */
export function markdownToEmailHtml(markdown: string, layout: LetterLayout = "plain"): string {
  return renderLetterInnerHtml(parseLetterBlocks(markdown), layout);
}

export function wrapEmailHtml(inner: string): string {
  const signed = /regen civics team/i.test(inner);
  const footer = signed
    ? ""
    : `<div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;"><p style="color:#4a7c59;font-weight:bold;">The ReGen Civics Team</p></div>`;
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:20px;">${inner}${footer}</div>`;
}

export function markdownEmailDocument(markdown: string): string {
  return wrapEmailHtml(markdownToEmailHtml(markdown, "plain"));
}

/** Wrap the current selection (or a placeholder) with markdown markers. */
export function applyMarkdownWrap(
  value: string,
  start: number,
  end: number,
  before: string,
  after: string,
  placeholder = "",
): { value: string; selectionStart: number; selectionEnd: number } {
  const from = Math.max(0, Math.min(start, value.length));
  const to = Math.max(from, Math.min(end, value.length));
  const inner = value.slice(from, to) || placeholder;
  const next = value.slice(0, from) + before + inner + after + value.slice(to);
  const selectionStart = from + before.length;
  return { value: next, selectionStart, selectionEnd: selectionStart + inner.length };
}

/** Prefix the line that contains the caret (headings, lists, quotes). */
export function applyMarkdownLinePrefix(
  value: string,
  start: number,
  prefix: string,
): { value: string; selectionStart: number; selectionEnd: number } {
  const from = Math.max(0, Math.min(start, value.length));
  const lineStart = value.lastIndexOf("\n", from - 1) + 1;
  const next = value.slice(0, lineStart) + prefix + value.slice(lineStart);
  const caret = from + prefix.length;
  return { value: next, selectionStart: caret, selectionEnd: caret };
}
