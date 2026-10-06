/**
 * A name and email left on the week board, stored as a Contact Us inquiry.
 * A second note from the same email on the same week updates the link, not
 * the row. Notices stay off here. Raise-a-hand sign-ups still notify.
 */
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { boardKeyTagFor } from "@shared/boardIdentityLink";
import {
  BOARD_SIGNUP_SOURCE_PREFIX,
  boardSignupSource,
  followUpNotes,
  type BoardFollowUpFrom,
} from "@shared/boardSignup";
import { boardIdentity, cleanBoardLine } from "@shared/sessionBoard";
import { generalInquiries } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { addContactTag, getContactTags, getDb } from "../db";
import { submitGeneralInquiry } from "./generalInquiry";

function identityKeys(user: TrpcContext["user"], voterKey: string | undefined): string[] {
  const keys: string[] = [];
  const own = boardIdentity(user?.id ?? null, null);
  if (own) keys.push(own);
  const guest = boardIdentity(null, voterKey ?? null);
  if (guest) keys.push(guest);
  return keys;
}

export type LeaveContactInput = {
  week: number;
  voterKey?: string;
  fullName: string;
  email: string;
  from?: BoardFollowUpFrom;
};

async function addTagOnce(contactType: "inquiry" | "user", contactId: number, tag: string) {
  const existing = await getContactTags(contactType, contactId);
  if (existing.some((row) => row.tag === tag)) return;
  await addContactTag({ contactType, contactId, tag });
}

/** Link k: and u: identities to an inquiry. Raw keys stay on the server. */
export async function linkInquiryIdentities(inquiryId: number, identities: string[], week: number) {
  const tags = [BOARD_SIGNUP_SOURCE_PREFIX, `week-${week}`];
  for (const identity of identities) tags.push(await boardKeyTagFor(identity));
  for (const tag of tags) await addTagOnce("inquiry", inquiryId, tag);
}

export async function leaveContactOnBoard(
  ctx: TrpcContext,
  input: LeaveContactInput,
  opts?: { season?: string },
): Promise<{ id: number; success: true; created: boolean }> {
  const fullName = cleanBoardLine(input.fullName, 120);
  if (!fullName) throw new TRPCError({ code: "BAD_REQUEST", message: "A name is needed." });
  const email = input.email.trim();
  const wanted = email.toLowerCase();
  const source = boardSignupSource(input.week);
  const keys = identityKeys(ctx.user, input.voterKey);

  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

  const rows = await db
    .select({ id: generalInquiries.id, email: generalInquiries.email })
    .from(generalInquiries)
    .where(eq(generalInquiries.referralSource, source));
  const existing = rows.find((row) => row.email.toLowerCase() === wanted);

  let inquiryId: number;
  let created = false;
  if (existing) {
    inquiryId = existing.id;
  } else {
    const saved = await submitGeneralInquiry(ctx, {
      pathType: "something_else",
      email,
      fullName,
      roleInterest: "follow-up",
      additionalNotes: followUpNotes(input.week, input.from),
      referralSource: source,
    }, { notify: false });
    inquiryId = Number(saved.id);
    created = true;
  }

  if (Number.isFinite(inquiryId) && inquiryId > 0) {
    try {
      await linkInquiryIdentities(inquiryId, keys, input.week);
    } catch (e) {
      console.warn("Board follow-up tags were not saved:", e);
    }
  }

  // season is accepted so tests can document the board they mean. The contact
  // itself does not depend on the board row, and a closed board does not throw.
  void opts?.season;
  return { id: inquiryId, success: true, created };
}

/** A signed-in player links the browser key they used as a guest. No inquiry row. */
export async function linkBrowserOnBoard(
  ctx: TrpcContext,
  input: { week: number; voterKey?: string },
): Promise<{ ok: true }> {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sign in to link this browser." });
  }
  const guest = boardIdentity(null, input.voterKey ?? null);
  if (!guest) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Reload the page so your browser can hold your place on the board." });
  }
  const tag = await boardKeyTagFor(guest);
  await addTagOnce("user", ctx.user.id, tag);
  void input.week;
  return { ok: true };
}
