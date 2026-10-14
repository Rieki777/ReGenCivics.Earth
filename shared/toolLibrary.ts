/**
 * The ReGen Tools Library's shared rules (ADR-73): what a tool an applicant
 * brings looks like, how its link is cleaned, and how two links are judged to
 * be the same tool so the library never lists one twice.
 */
import { cleanRepoUrl } from "./interopTools";

export const TOOL_KINDS = [
  { id: "software", label: "App or software", hint: "A platform, app, protocol or codebase" },
  { id: "physical", label: "Physical tool", hint: "Equipment, a kit, a build system, hardware" },
  { id: "service", label: "Service or method", hint: "A practice, process, training or service" },
] as const;
export type ToolKind = (typeof TOOL_KINDS)[number]["id"];

export function isToolKind(v: unknown): v is ToolKind {
  return typeof v === "string" && TOOL_KINDS.some((k) => k.id === v);
}

/** One tool on an application before it is sent. Link and description are required to send. */
export type DraftTool = {
  name: string;
  url: string;
  description: string;
  kind: ToolKind;
  isOpenSource: boolean;
};

export const MAX_DRAFT_TOOLS = 5;
export const TOOL_NAME_MAX = 120;
export const TOOL_DESCRIPTION_MAX = 1000;
export const TOOL_DESCRIPTION_MIN = 15;

/** A name from a link when the applicant left it blank: "seedcommons.org" from https://www.seedcommons.org/x. */
export function nameFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Keep up to five tools, trimmed and bounded, from whatever was stored or
 * sent. A tool with neither a link nor a description is an empty row and
 * drops; a link that is not http or https is kept as typed so the form can
 * say what is wrong instead of losing it.
 */
export function cleanDraftTools(raw: unknown): DraftTool[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { list = []; }
  }
  if (!Array.isArray(list)) return [];
  const out: DraftTool[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const t = item as Record<string, unknown>;
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const tool: DraftTool = {
      name: str(t.name, TOOL_NAME_MAX),
      url: str(t.url, 500),
      description: str(t.description, TOOL_DESCRIPTION_MAX),
      kind: isToolKind(t.kind) ? t.kind : "software",
      isOpenSource: t.isOpenSource === true,
    };
    if (!tool.url && !tool.description && !tool.name) continue;
    out.push(tool);
    if (out.length >= MAX_DRAFT_TOOLS) break;
  }
  return out;
}

/** What one tool still needs before the application can be sent, in the applicant's words. */
export function toolProblems(tool: DraftTool): string[] {
  const problems: string[] = [];
  if (!tool.url) problems.push("a link");
  else if (!cleanRepoUrl(tool.url)) problems.push("a web address that starts with http or https");
  if (tool.description.length < TOOL_DESCRIPTION_MIN) problems.push("a sentence on what it does");
  return problems;
}

/** The first tool's gaps as a phrase that follows "Add" ("a link for tool 2"), or null when every tool is ready. */
export function draftToolsMissing(tools: DraftTool[]): string | null {
  for (let i = 0; i < tools.length; i++) {
    const p = toolProblems(tools[i]);
    if (p.length) return `${p.join(" and ")} for tool ${i + 1}`;
  }
  return null;
}

/**
 * The key two links share when they are the same tool: host without "www.",
 * lower case, and the path without a trailing slash; scheme, query and
 * fragment ignored. "https://www.Hylo.com/" and "http://hylo.com" match.
 */
export function toolUrlKey(raw: string | null | undefined): string | null {
  const url = cleanRepoUrl(raw);
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    const path = u.pathname.replace(/\/+$/, "").toLowerCase();
    return `${host}${path}`;
  } catch {
    return null;
  }
}

/** A slug from a name: lower case, words joined by hyphens, bounded. */
export function toolSlugBase(name: string): string {
  const base = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
  return base || "tool";
}

/** "Used by 3 land projects", or null when none say so. */
export function usedByLine(n: number | null | undefined): string | null {
  if (!n) return null;
  return `Used by ${n} land project${n === 1 ? "" : "s"}`;
}
