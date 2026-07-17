/**
 * Needs and Offers board writes shared by the /board router and every
 * application form's submit procedure (Phase B2). Application forms pass their
 * optional freeform "what do you need / what can you offer" text here; each
 * non-empty text becomes one open board row tagged with the source form.
 * Form-sourced rows join matching but are not listed publicly (the applicant
 * wrote them inside a private application, not on a public board).
 */

import { getDb } from "../db";
import { projectNeeds, playerOffers } from "../../drizzle/schema";
import { sanitizeInput } from "../_core/security";

export type FormBoardCapture = {
  /** Source form family tag, e.g. "incubator_application", "ship_keeper". */
  source: string;
  sourceId: number | null;
  ownerId?: number | null;
  contactName?: string | null;
  contactEmail?: string | null;
  bioregionId?: number | null;
  needsText?: string | null;
  offersText?: string | null;
};

/** Freeform text becomes a row title (first line, bounded) plus full body. */
export function titleFromText(text: string): string {
  const firstLine = text.trim().split(/\r?\n/)[0] ?? "";
  return firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine || "Posted from an application";
}

/**
 * Insert board rows for a form submission. Never throws: a board hiccup must
 * not break an application submit. Returns how many rows were created.
 */
export async function captureFormNeedsOffers(input: FormBoardCapture): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    let created = 0;

    const base = {
      ownerId: input.ownerId ?? null,
      contactName: input.contactName ? sanitizeInput(input.contactName).slice(0, 200) : null,
      contactEmail: input.contactEmail ? input.contactEmail.slice(0, 320) : null,
      bioregionId: input.bioregionId ?? null,
      source: input.source.slice(0, 50),
      sourceId: input.sourceId,
    };

    const needsText = input.needsText?.trim();
    if (needsText) {
      await db.insert(projectNeeds).values({
        ...base,
        title: sanitizeInput(titleFromText(needsText)),
        body: sanitizeInput(needsText).slice(0, 5000),
        tags: [],
      });
      created += 1;
    }

    const offersText = input.offersText?.trim();
    if (offersText) {
      await db.insert(playerOffers).values({
        ...base,
        title: sanitizeInput(titleFromText(offersText)),
        body: sanitizeInput(offersText).slice(0, 5000),
        tags: [],
      });
      created += 1;
    }
    return created;
  } catch (err) {
    console.warn("[needsOffers] form capture failed (non-fatal):", (err as any)?.message);
    return 0;
  }
}
