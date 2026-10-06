/**
 * Raise a hand on the Season week board: a Contact Us inquiry, plus the hand
 * count. The count still moves after the board closes and after the session ends.
 *
 * A closed board, and a session that has ended, still keep the name and email
 * and still count the hand. The contact is saved even when the vote is not.
 */
import { TRPCError } from "@trpc/server";
import { sql } from "drizzle-orm";
import {
  boardOfferInterest,
  boardSignupSource,
  boardSignupTags,
} from "@shared/boardSignup";
import {
  SESSION_BOARD_SEASON,
  boardIdentity,
  boardStages,
  cleanBoardLine,
  voteTarget,
  type BoardOfferKey,
} from "@shared/sessionBoard";
import { boardKeyTagFor } from "@shared/boardIdentityLink";
import { sessionBoardVotes } from "../../drizzle/schema";
import type { TrpcContext } from "../_core/context";
import { getDb } from "../db";
import * as dbApi from "../db";
import { submitGeneralInquiry } from "./generalInquiry";
import { bumpVersion, ensureBoard } from "./sessionBoard";

const NOTE_MAX = 200;

export type BoardSignUpInput = {
  week: number;
  voterKey?: string;
  offer: BoardOfferKey;
  fullName: string;
  email: string;
  note?: string;
};

function identityKeys(user: TrpcContext["user"], voterKey: string | undefined): string[] {
  const keys: string[] = [];
  const own = boardIdentity(user?.id ?? null, null);
  if (own) keys.push(own);
  const guest = boardIdentity(null, voterKey ?? null);
  if (guest) keys.push(guest);
  return keys;
}

/**
 * Store the sign-up, then raise the hand when the board is still a live room.
 * `season` is for tests. The public procedure always uses Season 2.
 */
export async function signUpOnBoard(
  ctx: TrpcContext,
  input: BoardSignUpInput,
  opts?: { season?: string; now?: number },
): Promise<{ id: number; success: true; handed: boolean }> {
  if (!boardStages(input.week).some((s) => s.kind === "together")) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "This week's board has no hands to raise for that." });
  }
  const fullName = cleanBoardLine(input.fullName, 120);
  if (!fullName) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "A name is needed." });
  }
  const note = input.note ? cleanBoardLine(input.note, NOTE_MAX) : null;
  const interest = boardOfferInterest(input.offer);
  const saved = await submitGeneralInquiry(ctx, {
    pathType: "something_else",
    email: input.email,
    fullName,
    roleInterest: interest.roleInterest,
    roleArchetypes: interest.roleArchetypes,
    additionalNotes: note ?? undefined,
    referralSource: boardSignupSource(input.week),
  });

  const inquiryId = Number(saved.id);
  if (Number.isFinite(inquiryId) && inquiryId > 0) {
    try {
      const tags = [...boardSignupTags(input.week, input.offer)];
      for (const identity of identityKeys(ctx.user, input.voterKey)) {
        tags.push(await boardKeyTagFor(identity));
      }
      const existing = new Set((await dbApi.getContactTags("inquiry", inquiryId)).map((t) => t.tag));
      for (const tag of tags) {
        if (existing.has(tag)) continue;
        await dbApi.addContactTag({ contactType: "inquiry", contactId: inquiryId, tag });
        existing.add(tag);
      }
    } catch (e) {
      console.warn("Board sign-up tags were not saved:", e);
    }
  }

  const handed = await raiseHandIfLive(input, identityKeys(ctx.user, input.voterKey), opts);
  return { id: saved.id, success: true, handed };
}

async function raiseHandIfLive(
  input: BoardSignUpInput,
  keys: string[],
  opts?: { season?: string; now?: number },
): Promise<boolean> {
  if (keys.length === 0) return false;
  const db = await getDb();
  if (!db) return false;
  const season = opts?.season ?? SESSION_BOARD_SEASON;
  try {
    const board = await ensureBoard(db, season, input.week);
    const target = voteTarget.offer(input.offer);
    await db
      .insert(sessionBoardVotes)
      .values({ boardId: board.id, target, voterKey: keys[0] })
      .onDuplicateKeyUpdate({ set: { target: sql`target` } });
    await bumpVersion(db, board.id);
    return true;
  } catch (e) {
    console.warn("Board sign-up was saved, and the hand count was not:", e);
    return false;
  }
}
