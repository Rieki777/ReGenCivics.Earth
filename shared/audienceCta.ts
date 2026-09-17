/**
 * One primary audience CTA for past-event cards / session wraps.
 * Paths must stay inside shared/siteContext.ts allowlist.
 */
import { absoluteSiteUrl } from "./siteContext";

export type AudienceCta = {
  path: string;
  label: string;
  url: string;
};

export type AudienceCtaEvent = {
  type?: string | null;
  season?: string | null;
  title?: string | null;
} | null | undefined;

/**
 * Heuristic from event.type / season / title keywords.
 * Priority: season2 → seeds/claim → investor → loi → apply/land → open access → connect.
 */
export function pickAudienceCta(event?: AudienceCtaEvent): AudienceCta {
  const type = (event?.type ?? "").toLowerCase();
  const season = (event?.season ?? "").toLowerCase();
  const title = (event?.title ?? "").toLowerCase();
  const blob = `${type} ${season} ${title}`;

  if (
    type === "episode" ||
    season.includes("season 2") ||
    season.includes("s2") ||
    blob.includes("season 2") ||
    /\bs2\b/.test(blob)
  ) {
    return {
      path: "/season2",
      label: "Explore Season 2",
      url: absoluteSiteUrl("/season2"),
    };
  }

  if (
    (blob.includes("claim") && blob.includes("seed")) ||
    blob.includes("claim-seeds") ||
    blob.includes("claim seeds")
  ) {
    return {
      path: "/claim-seeds",
      label: "Claim SEEDS",
      url: absoluteSiteUrl("/claim-seeds"),
    };
  }

  if (blob.includes("investor") || blob.includes("investment")) {
    return {
      path: "/investor",
      label: "Investor path",
      url: absoluteSiteUrl("/investor"),
    };
  }

  if (blob.includes("loi") || blob.includes("letter of intent")) {
    return {
      path: "/loi",
      label: "Share a letter of intent",
      url: absoluteSiteUrl("/loi"),
    };
  }

  if (
    blob.includes("apply") ||
    blob.includes("application") ||
    blob.includes("land project") ||
    blob.includes("land application")
  ) {
    return {
      path: "/apply",
      label: "Apply to join",
      url: absoluteSiteUrl("/apply"),
    };
  }

  if (type === "open" || blob.includes("open access")) {
    return {
      path: "/schedule",
      label: "See upcoming sessions",
      url: absoluteSiteUrl("/schedule"),
    };
  }

  return {
    path: "/connect",
    label: "Connect with us",
    url: absoluteSiteUrl("/connect"),
  };
}
