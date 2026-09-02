/**
 * Markdown to email-safe HTML.
 *
 * Admin composers write markdown. Resend needs inline-styled HTML. This
 * converter is the only path between those two, so the preview and the
 * sent email stay the same. Merge tokens like {{name}} pass through
 * unescaped so per-recipient substitution still works after conversion.
 */

const MERGE_TOKEN = /\{\{[a-zA-Z0-9_]+\}\}/g;

const P = 'color:#333;line-height:1.6;margin:0 0 12px 0;';
const H = 'color:#1a472a;margin:20px 0 10px 0;font-family:Georgia,serif;';
const LI = 'color:#333;line-height:1.8;margin:0 0 4px 0;';
const A = 'color:#4a7c59;';
const QUOTE = 'color:#333;line-height:1.6;margin:0 0 12px 0;padding-left:14px;border-left:3px solid #4a7c59;';
const CODE = 'font-family:ui-monospace,monospace;font-size:0.9em;background:#f0ebe3;padding:1px 4px;border-radius:3px;';

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

function safeHref(raw: string): string | null {
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

function inlineFormat(raw: string): string {
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

function flushParagraph(buf: string[]): string {
  const text = buf.join(" ").trim();
  buf.length = 0;
  if (!text) return "";
  return `<p style="${P}">${inlineFormat(text)}</p>`;
}

function flushList(items: string[], ordered: boolean): string {
  if (items.length === 0) return "";
  const tag = ordered ? "ol" : "ul";
  const lis = items.map((item) => `<li style="${LI}">${inlineFormat(item)}</li>`).join("");
  items.length = 0;
  return `<${tag} style="margin:0 0 12px 18px;padding:0;">${lis}</${tag}>`;
}

/**
 * Convert a markdown email body to inner HTML (no outer wrapper, no signature).
 */
export function markdownToEmailHtml(markdown: string): string {
  const src = (markdown ?? "").replace(/\r\n/g, "\n").trim();
  if (!src) return "";

  const lines = src.split("\n");
  const out: string[] = [];
  const para: string[] = [];
  const listItems: string[] = [];
  let listOrdered: boolean | null = null;

  const endList = () => {
    if (listOrdered === null) return;
    out.push(flushList(listItems, listOrdered));
    listOrdered = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    const ul = trimmed.match(/^[-*] (.+)$/);
    const ol = trimmed.match(/^\d+\. (.+)$/);
    const heading = trimmed.match(/^(#{1,3})\s+(.+)$/);

    if (ul || ol) {
      out.push(flushParagraph(para));
      const ordered = Boolean(ol);
      if (listOrdered !== null && listOrdered !== ordered) endList();
      listOrdered = ordered;
      listItems.push((ul?.[1] ?? ol?.[1] ?? "").trim());
      continue;
    }

    endList();

    if (!trimmed) {
      out.push(flushParagraph(para));
      continue;
    }

    if (heading) {
      out.push(flushParagraph(para));
      const level = heading[1].length;
      const tag = level === 1 ? "h1" : level === 2 ? "h2" : "h3";
      const size = level === 1 ? "22px" : level === 2 ? "18px" : "16px";
      out.push(`<${tag} style="${H}font-size:${size};">${inlineFormat(heading[2])}</${tag}>`);
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      out.push(flushParagraph(para));
      out.push('<hr style="border:none;border-top:1px solid #e0e0e0;margin:16px 0;" />');
      continue;
    }

    if (trimmed.startsWith("> ")) {
      out.push(flushParagraph(para));
      out.push(`<blockquote style="${QUOTE}">${inlineFormat(trimmed.slice(2))}</blockquote>`);
      continue;
    }

    para.push(trimmed);
  }

  endList();
  out.push(flushParagraph(para));
  return out.filter(Boolean).join("");
}

export function wrapEmailHtml(inner: string): string {
  const signed = /regen civics team/i.test(inner);
  const footer = signed
    ? ""
    : `<div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;"><p style="color:#4a7c59;font-weight:bold;">The ReGen Civics Team</p></div>`;
  return `<div style="font-family:Georgia,'Times New Roman',serif;max-width:600px;margin:0 auto;padding:20px;">${inner}${footer}</div>`;
}

export function markdownEmailDocument(markdown: string): string {
  return wrapEmailHtml(markdownToEmailHtml(markdown));
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
