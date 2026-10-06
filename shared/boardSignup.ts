/**
 * A raised hand on the Season week board, stored as a Contact Us inquiry.
 *
 * general_inquiries.pathType is a MySQL ENUM, so a board sign-up reuses
 * "something_else" and carries its origin in referralSource. No new column.
 */
import type { BoardOfferKey } from "./sessionBoard";

export const BOARD_SIGNUP_SOURCE_PREFIX = "season2-week-board";

/** referralSource for one week's board. Week 2 is "season2-week-board:week-2". */
export function boardSignupSource(week: number): string {
  return `${BOARD_SIGNUP_SOURCE_PREFIX}:week-${week}`;
}

/** The week encoded in a board sign-up's referralSource, or null when it is not one. */
export function parseBoardSignupSource(source: string | null | undefined): { week: number } | null {
  if (typeof source !== "string") return null;
  const match = /^season2-week-board:week-([1-9]\d*)$/.exec(source.trim());
  if (!match) return null;
  const week = Number(match[1]);
  if (!Number.isInteger(week) || week < 2 || week > 13) return null;
  return { week };
}

/** True for any referralSource that belongs to the season board, including a week we do not parse. */
export function isBoardSignupSource(source: string | null | undefined): boolean {
  return typeof source === "string" && source.startsWith(BOARD_SIGNUP_SOURCE_PREFIX);
}

export type BoardOfferInterest = {
  roleInterest: "coach" | "builder";
  roleArchetypes: string;
  label: "Coach" | "Builder";
  tag: "coach" | "builder";
};

/** BOARD_OFFERS key "build" is the interest "builder". Coach stays "coach". */
export function boardOfferInterest(offer: BoardOfferKey): BoardOfferInterest {
  if (offer === "build") {
    return {
      roleInterest: "builder",
      roleArchetypes: JSON.stringify(["Builder"]),
      label: "Builder",
      tag: "builder",
    };
  }
  return {
    roleInterest: "coach",
    roleArchetypes: JSON.stringify(["Coach"]),
    label: "Coach",
    tag: "coach",
  };
}

export function interestFromRole(roleInterest: string | null | undefined): "Coach" | "Builder" | null {
  if (roleInterest === "builder") return "Builder";
  if (roleInterest === "coach") return "Coach";
  return null;
}

/** contact_tags for one sign-up: the board, the week, and coach or builder. */
export function boardSignupTags(week: number, offer: BoardOfferKey): string[] {
  return [BOARD_SIGNUP_SOURCE_PREFIX, `week-${week}`, boardOfferInterest(offer).tag];
}
