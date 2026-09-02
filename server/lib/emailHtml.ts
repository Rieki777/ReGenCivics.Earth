/**
 * Email HTML assembly: markdown (or plain text) to a sanitized Resend body.
 * Styles stay on the tags because email clients ignore stylesheets.
 */
import sanitizeHtml from "sanitize-html";
import { brandedLetterDocument } from "../../shared/letterHtml";
import type { LetterLayout } from "../../shared/letterLayout";
import { markdownToEmailHtml, wrapEmailHtml } from "../../shared/emailMarkdown";

const EMAIL_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: [
    "b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li",
    "blockquote", "code", "pre", "h1", "h2", "h3", "h4", "hr", "div",
    "span", "table", "thead", "tbody", "tr", "td", "th", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "style"],
    img: ["src", "alt", "width", "height", "style"],
    table: ["role", "cellpadding", "cellspacing", "border", "width", "align", "style"],
    td: ["align", "valign", "width", "bgcolor", "style"],
    tr: ["style"],
    th: ["style"],
    "*": ["style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["https"],
  },
  disallowedTagsMode: "discard",
  transformTags: {
    img: (_tag, attribs) => {
      const src = attribs.src || "";
      try {
        const host = new URL(src).hostname;
        if (
          host === "regencivics.earth" ||
          host === "www.regencivics.earth" ||
          host === "assets.regencivics.earth"
        ) {
          return { tagName: "img", attribs };
        }
      } catch {
        /* drop */
      }
      return { tagName: "span", attribs: {}, text: attribs.alt || "" };
    },
  },
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SANITIZE);
}

export function emailDocumentFromMarkdown(
  markdown: string,
  layout: LetterLayout = "plain",
): string {
  const inner = sanitizeEmailHtml(markdownToEmailHtml(markdown, layout));
  if (layout === "plain") return wrapEmailHtml(inner);
  return brandedLetterDocument(inner, layout);
}

/** Legacy newline-to-paragraph path used before markdown composers. */
export function emailDocumentFromPlain(text: string): string {
  const inner = (text ?? "")
    .split(/\n\n+/)
    .map((para) => para.trim())
    .filter(Boolean)
    .map((para) => `<p style="color:#333;line-height:1.6;margin:0 0 12px 0;">${para.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return wrapEmailHtml(sanitizeEmailHtml(inner));
}

export function emailDocumentFromBody(
  body: string,
  format: "markdown" | "plain" | "html",
  layout: LetterLayout = "plain",
): string {
  if (format === "html") return sanitizeEmailHtml(body);
  if (format === "plain") return emailDocumentFromPlain(body);
  return emailDocumentFromMarkdown(body, layout);
}
