/**
 * Shared email chrome for every ReGen Civics letter.
 * Header text is white on the dark green banner. Body text is near-black
 * on a white card. The same pairs are locked in for dark mode so Gmail
 * and Apple Mail cannot turn the wordmark into dark green on green.
 */

export const EMAIL_BANNER_BG = "#1a472a";
export const EMAIL_HEADER_TEXT = "#ffffff";
export const EMAIL_BODY_TEXT = "#1a1a1a";
export const EMAIL_MUTED_TEXT = "#3d4a40";
export const EMAIL_CARD_BG = "#ffffff";
export const EMAIL_PAGE_BG = "#f5f5f5";
export const EMAIL_SUMMARY_BG = "#f4f7f4";

function channel(hex: string, index: number): number {
  const n = parseInt(hex.replace("#", "").slice(index * 2, index * 2 + 2), 16) / 255;
  return n <= 0.03928 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
}

/** WCAG contrast ratio for two #rrggbb colors. */
export function contrastRatio(fg: string, bg: string): number {
  const lum = (hex: string) => 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
  const lighter = Math.max(lum(fg), lum(bg));
  const darker = Math.min(lum(fg), lum(bg));
  return (lighter + 0.05) / (darker + 0.05);
}

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** color-scheme metas plus rules that keep the same AA pairs in dark mode. */
export function emailColorSchemeHead(): string {
  return `<meta name="color-scheme" content="light dark">
<meta name="supported-color-schemes" content="light dark">
<style>
:root { color-scheme: light dark; supported-color-schemes: light dark; }
@media (prefers-color-scheme: dark) {
  .rc-page { background-color: ${EMAIL_PAGE_BG} !important; }
  .rc-card, .rc-summary { background-color: ${EMAIL_CARD_BG} !important; }
  .rc-summary { background-color: ${EMAIL_SUMMARY_BG} !important; }
  .rc-banner { background-color: ${EMAIL_BANNER_BG} !important; }
  .rc-banner-title, .rc-banner-eyebrow, .rc-button { color: ${EMAIL_HEADER_TEXT} !important; }
  .rc-button { background-color: ${EMAIL_BANNER_BG} !important; }
  .rc-heading, .rc-text { color: ${EMAIL_BODY_TEXT} !important; }
  .rc-muted, .rc-legal { color: ${EMAIL_MUTED_TEXT} !important; }
}
[data-ogsc] .rc-banner-title, [data-ogsc] .rc-banner-eyebrow, [data-ogsc] .rc-button { color: ${EMAIL_HEADER_TEXT} !important; }
[data-ogsb] .rc-banner, [data-ogsc] .rc-button { background-color: ${EMAIL_BANNER_BG} !important; }
[data-ogsc] .rc-heading, [data-ogsc] .rc-text { color: ${EMAIL_BODY_TEXT} !important; }
[data-ogsc] .rc-card { background-color: ${EMAIL_CARD_BG} !important; }
[data-ogsc] .rc-muted, [data-ogsc] .rc-legal { color: ${EMAIL_MUTED_TEXT} !important; }
</style>`;
}

export function emailDocumentHtml(body: string, title = "ReGen Civics"): string {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
${emailColorSchemeHead()}
<title>${esc(title)}</title>
</head>
<body class="rc-page" style="margin:0;padding:0;background-color:${EMAIL_PAGE_BG};">
${body}
</body>
</html>`;
}

/** One dark-green banner. No gradient: Gmail treats gradients as a light fill and inverts the type. */
export function emailBannerHtml(eyebrow: string): string {
  const line = eyebrow.trim();
  const eyebrowHtml = line
    ? `<p class="rc-banner-eyebrow" style="color:${EMAIL_HEADER_TEXT};margin:6px 0 0 0;font-size:12px;font-family:Arial,sans-serif;">${esc(line)}</p>`
    : "";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" class="rc-banner" bgcolor="${EMAIL_BANNER_BG}" style="background-color:${EMAIL_BANNER_BG};">
<tr>
<td class="rc-banner" bgcolor="${EMAIL_BANNER_BG}" align="center" style="background-color:${EMAIL_BANNER_BG};padding:28px 20px;text-align:center;">
<h1 class="rc-banner-title" style="color:${EMAIL_HEADER_TEXT};margin:0;font-size:22px;font-family:Arial,sans-serif;font-weight:bold;">ReGen Civics</h1>
${eyebrowHtml}
</td>
</tr>
</table>`;
}

export function emailPrimaryButton(href: string, label: string): string {
  return `<a class="rc-button" href="${esc(href)}" style="display:inline-block;background-color:${EMAIL_BANNER_BG};color:${EMAIL_HEADER_TEXT};padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:bold;font-size:15px;margin:0 8px 8px 0;">${esc(label)}</a>`;
}
