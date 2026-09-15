/**
 * Admin AI system-prompt slices that must stay testable: Outbound Write
 * compose-into-fields, and the hard no-send rule. Chat never calls Resend.
 */

export const OUTBOUND_WRITE_COMPOSE_EXAMPLE =
  '<action>{"type":"compose","tab":"outbound","surface":"write","subject":"Season update","body":"Friends,\\n\\nHere is this week\'s note.\\n\\n[Watch the stream](https://regencivics.earth/)","layout":"announcement","label":"Use this in Write"}</action>';

export const OUTBOUND_WRITE_SEND_REDIRECT =
  "Send stays on Write. Use Preview send, then Confirm. Or tap Apply to draft on Write with me. I can put this letter in the composer.";

/** Always-on: the FAB can draft into Write and must never claim it sent. */
export const OUTBOUND_WRITE_ASSISTANT_BLOCK = `
## Outbound Write (subscriber letters)
You can draft a newsletter into the Write composer. You cannot send email. You cannot send to subscribers. Never say you will send, are sending, or have sent a letter. Never use execute for mail.

If the admin asks you to send, send now, send to all subscribers, or proceed to send: refuse. Tell them to use Preview send, then Confirm on Write, or to tap Apply to draft on Write with me. Never ask "would you like to send this out?" Send is not a chat action.

When you draft a letter, emit a compose action so the fields fill. Do not leave the letter only in the chat bubble.
${OUTBOUND_WRITE_COMPOSE_EXAMPLE}
`;

export const OUTBOUND_WRITE_SURFACE_BLOCK = `
You are currently on Outbound Write. Put the draft in the composer with the compose action as soon as you write it, same as Apply to draft. Preview send and Confirm are on the Write form. Write with me Apply also fills the fields. This chat never sends.
`;

const SEND_CLAIM_RES: RegExp[] = [
  /\bi will proceed to send\b/i,
  /\bi['’]ll proceed to send\b/i,
  /\bsend this email to all subscribers\b/i,
  /\bsend(?:ing)? (?:this|the) (?:email|letter) to all (?:subscribers|recipients)\b/i,
  /\bi(?:['’]ll| will) send (?:this|it|the letter|the email)\b/i,
  /\bi(?:['’]m| am) (?:going to send|sending (?:this|it|now))\b/i,
  /\bsent to all subscribers\b/i,
  /\bwould you like to send\b/i,
  /\bwant me to send\b/i,
  /\bshall i send\b/i,
  /\bshould i send\b/i,
];

export function claimedOutboundSend(text: string): boolean {
  const src = text ?? "";
  return SEND_CLAIM_RES.some((re) => re.test(src));
}

export function guardAssistantSendClaim(
  content: string,
  opts: { onWrite: boolean },
): string {
  const src = content ?? "";
  if (!claimedOutboundSend(src)) return src;
  if (!opts.onWrite && !/subscriber/i.test(src)) return src;
  if (src.includes(OUTBOUND_WRITE_SEND_REDIRECT)) return src;
  return `${src.trim()}\n\n${OUTBOUND_WRITE_SEND_REDIRECT}`;
}
