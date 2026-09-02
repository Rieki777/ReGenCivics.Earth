/**
 * Email HTML assembly: markdown (or plain text) to a sanitized Resend body.
 * Styles stay on the tags because email clients ignore stylesheets.
 */
import sanitizeHtml from "sanitize-html";
import { markdownToEmailHtml, wrapEmailHtml } from "../../shared/emailMarkdown";

const EMAIL_SANITIZE: sanitizeHtml.IOptions = {
  allowedTags: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "blockquote", "code", "pre", "h1", "h2", "h3", "h4", "hr", "div"],
  allowedAttributes: {
    a: ["href", "title", "style"],
    "*": ["style"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  disallowedTagsMode: "discard",
};

export function sanitizeEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SANITIZE);
}

export function emailDocumentFromMarkdown(markdown: string): string {
  return wrapEmailHtml(sanitizeEmailHtml(markdownToEmailHtml(markdown)));
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

export function emailDocumentFromBody(body: string, format: "markdown" | "plain" | "html"): string {
  if (format === "html") return sanitizeEmailHtml(body);
  if (format === "plain") return emailDocumentFromPlain(body);
  return emailDocumentFromMarkdown(body);
}
