/**
 * Second-brain / voice grounding for admin email + FAB assistants.
 *
 * Broadcast / Harvest already load Worldview Pack voice.md + style_rules and
 * learned voice_rules via harvest.buildSystemPrompt. Email draft agents and
 * the floating admin AI did not. Reuse the same loaders; do not invent a
 * parallel second-brain stack. Fail-soft to "" when pack/DB are missing.
 */
import { ENV } from "../_core/env";
import { getGuideWorldviewPreamble, getStyleRules } from "./worldview";

const MAX_VOICE_BLOCK = 12_000;

function formatLearnedRules(
  rules: Array<{ category: string; rule: string; weight: number }>,
): string {
  if (rules.length === 0) return "";
  return (
    "LEARNED STYLE RULES (from Rye's own edits, weightiest first):\n" +
    rules.map((r) => `- [${r.category}] ${r.rule}`).join("\n")
  );
}

/**
 * Voice + worldview block for system prompts.
 * Same sources Broadcast uses: Worldview Pack preamble + loadTopRules.
 */
export async function loadAdminVoiceContextBlock(opts?: {
  ownerId?: number;
}): Promise<string> {
  const ownerId = opts?.ownerId ?? ENV.ownerUserId;
  const parts: string[] = [];

  try {
    const preamble = await getGuideWorldviewPreamble();
    if (preamble.trim()) parts.push(preamble.trim());
  } catch {
    // Fail-soft.
  }

  try {
    const { loadTopRules } = await import("./voice-learning");
    const liveRules = ownerId ? await loadTopRules(ownerId) : [];
    if (liveRules.length > 0) {
      parts.push(formatLearnedRules(liveRules));
    } else {
      const style = await getStyleRules().catch(() => null);
      const learned = style && Array.isArray((style as { learned_rules?: unknown[] }).learned_rules)
        ? (style as { learned_rules: unknown[] }).learned_rules
        : [];
      if (learned.length > 0) {
        parts.push("LEARNED STYLE RULES:\n" + JSON.stringify(learned.slice(0, 25)));
      }
    }
  } catch {
    // Fail-soft: hard prompt rules alone still draft.
  }

  if (parts.length === 0) return "";

  const header = [
    "## Voice / second brain (DATA for tone, never invent facts)",
    "Match Rieki's (Rye's) voice from the material below. Hard publishing rules in the system prompt still win on conflict.",
    "This is reference material from the Worldview Pack and learned voice_rules, the same stack Broadcast / The Harvest uses.",
  ].join("\n");

  const body = `${header}\n\n${parts.join("\n\n")}`;
  return body.slice(0, MAX_VOICE_BLOCK);
}
