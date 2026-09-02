/**
 * Full letter HTML for announcement and one-pager layouts.
 * Inner HTML is produced by the markdown converter. Chrome lives here so
 * preview and send use the same document. sendEmail must skip its branded
 * wrap for these layouts or the header would appear twice.
 */

import { LETTER_LOGO_URL, type LetterLayout } from "./letterLayout";
import { markdownToEmailHtml, wrapEmailHtml } from "./emailMarkdown";

function letterHeader(): string {
  return `
    <tr>
      <td bgcolor="#1a472a" style="background-color:#1a472a;padding:28px 20px;text-align:center;">
        <img src="${LETTER_LOGO_URL}" width="52" height="52" alt="ReGen Civics" style="display:block;margin:0 auto 10px auto;background:#ffffff;border-radius:10px;padding:4px;" />
        <p style="color:#7dd87d;margin:0;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:bold;">ReGen Civics</p>
        <p style="color:#a8e6a8;margin:6px 0 0 0;font-size:12px;font-family:Georgia,'Times New Roman',serif;">An Infinite Game for the ReGenerative Renaissance</p>
      </td>
    </tr>`;
}

function letterFooter(compact: boolean): string {
  if (compact) {
    return `
    <tr>
      <td style="background:#f0f7f0;padding:18px 20px;border-top:3px solid #7dd87d;text-align:center;">
        <p style="color:#4a7c59;font-size:12px;margin:0;font-family:Georgia,'Times New Roman',serif;">
          <a href="https://regencivics.earth" style="color:#4a7c59;">regencivics.earth</a>
        </p>
      </td>
    </tr>`;
  }
  return `
    <tr>
      <td style="background:#f0f7f0;padding:22px 20px;border-top:3px solid #7dd87d;">
        <p style="color:#1a472a;font-size:13px;margin:0 0 10px 0;text-align:center;font-family:Georgia,'Times New Roman',serif;">
          Questions or want to talk? We don't respond to emails directly. Use the Connect form and we'll route it.
        </p>
        <p style="text-align:center;margin:0 0 12px 0;">
          <a href="https://regencivics.earth/connect?path=something_else" style="display:inline-block;background:#1a472a;color:#ffffff;text-decoration:none;padding:10px 20px;border-radius:6px;font-size:13px;font-weight:bold;font-family:Georgia,'Times New Roman',serif;">Open the Connect form</a>
        </p>
        <p style="color:#4a7c59;font-size:12px;margin:0;text-align:center;font-family:Georgia,'Times New Roman',serif;">
          <a href="https://regencivics.earth" style="color:#4a7c59;">regencivics.earth</a>
        </p>
      </td>
    </tr>`;
}

export function brandedLetterDocument(inner: string, layout: LetterLayout): string {
  const width = layout === "one_pager" ? 680 : 600;
  const pad = layout === "one_pager" ? "22px 22px" : "30px 25px";
  const signed = /regen civics team/i.test(inner);
  const signature = signed
    ? ""
    : `<div style="margin-top:25px;padding-top:20px;border-top:1px solid #e0e0e0;"><p style="color:#4a7c59;font-weight:bold;font-family:Georgia,'Times New Roman',serif;margin:0;">The ReGen Civics Team</p></div>`;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ReGen Civics</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:20px 8px;">
        <table role="presentation" width="${width}" cellspacing="0" cellpadding="0" border="0" style="max-width:${width}px;width:100%;background:#ffffff;border-radius:8px;">
          ${letterHeader()}
          <tr>
            <td style="padding:${pad};font-family:Georgia,'Times New Roman',serif;">
              ${inner}${signature}
            </td>
          </tr>
          ${letterFooter(layout === "one_pager")}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function markdownLetterDocument(markdown: string, layout: LetterLayout = "plain"): string {
  const inner = markdownToEmailHtml(markdown, layout);
  if (layout === "plain") return wrapEmailHtml(inner);
  return brandedLetterDocument(inner, layout);
}
