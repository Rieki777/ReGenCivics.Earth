/**
 * Interoperability sheets: one intake for the tools library and the Circle.
 *
 * Somebody describing their tool here is submitting it to the tools library
 * AND answering the interoperability questions in the same pass. That is why
 * there is one procedure rather than two: a tool that came in through this
 * door has already told us what it speaks, so the library can show which of
 * its tools are part of the shared system and which have not started.
 *
 * regen_tools stays the canonical tool, with its own page, categories,
 * endorsements and moderation. The sheet hangs off it and adds the facets that
 * decide whether two projects can actually meet.
 *
 * Public and unauthenticated, like the vote, because most of this circle has
 * no account on the site. That means every mutation here is rate limited and
 * every field is cleaned, and a submission lands as `pending` for the public
 * library while showing immediately on the Circle page.
 */

import { adminProcedure, publicProcedure, rateLimited, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { interopProposals, interopSheets } from "../../drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { storagePut } from "../storage";
import {
  OVERLAP_AXES,
  cleanFacets,
  cleanTerms,
  commonGround,
  computeOverlaps,
  normalizeTerm,
  termKey,
  type OverlapAxis,
  type OverlapInput,
} from "@shared/interopSheet";
import { cleanRepoUrl } from "@shared/interopTools";
import { interopStageOf } from "@shared/interopStage";

/** Public writes here reach a public list and the tools library, so both are capped. */
const SHEET_LIMIT = { windowMs: 60_000, max: 6 };
const PROPOSAL_LIMIT = { windowMs: 60_000, max: 6 };

/** How many sheets the page reads. A working group, not a marketplace. */
const SHEET_READ_LIMIT = 300;

/**
 * What an attached overview may be.
 *
 * Deliberately narrow: this is anonymous public intake, and the file is
 * offered back to other people as a download. Documents and plain text only,
 * nothing executable and nothing that renders as script in a browser.
 */
const ALLOWED_DOC_TYPES: Record<string, string> = {
  "application/pdf": "pdf",
  "text/markdown": "md",
  "text/plain": "txt",
  "application/json": "json",
  "application/yaml": "yaml",
  "text/yaml": "yaml",
};

/** 4MB. Comfortably more than an overview needs, far less than storagePut allows. */
const MAX_DOC_BYTES = 4 * 1024 * 1024;

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 200);
}

/** Free text that other people will read: bounded and stripped of disguising characters. */
function cleanProse(raw: string | undefined | null, max: number): string | null {
  if (typeof raw !== "string") return null;
  const stripped = raw
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/[\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, "")
    .trim()
    .slice(0, max);
  return stripped.length > 0 ? stripped : null;
}

const facetsInput = z.object({
  protocols: z.array(z.string()).max(64).optional(),
  dataFormats: z.array(z.string()).max(64).optional(),
  identityModels: z.array(z.string()).max(64).optional(),
  surfaces: z.array(z.string()).max(64).optional(),
});

type SheetRow = {
  id: number;
  toolId: number;
  toolName: string;
  protocols: unknown;
  dataFormats: unknown;
  identityModels: unknown;
  surfaces: unknown;
  summary: string | null;
  integrationNotes: string | null;
  docKey: string | null;
  docName: string | null;
  contactName: string | null;
  stage: string;
};

/** JSON columns come back as arrays or as strings depending on the driver. */
function readJsonArray(value: unknown): string[] {
  if (Array.isArray(value)) return cleanTerms(value);
  if (typeof value === "string") {
    try {
      return cleanTerms(JSON.parse(value));
    } catch {
      return [];
    }
  }
  return [];
}

function toOverlapInput(row: SheetRow): OverlapInput {
  return {
    id: row.id,
    toolName: row.toolName,
    facets: {
      protocols: readJsonArray(row.protocols),
      dataFormats: readJsonArray(row.dataFormats),
      identityModels: readJsonArray(row.identityModels),
      surfaces: readJsonArray(row.surfaces),
    },
  };
}

async function readSheets(database: NonNullable<Awaited<ReturnType<typeof getDb>>>): Promise<SheetRow[]> {
  return (await database
    .select({
      id: interopSheets.id,
      toolId: interopSheets.toolId,
      toolName: interopSheets.toolName,
      protocols: interopSheets.protocols,
      dataFormats: interopSheets.dataFormats,
      identityModels: interopSheets.identityModels,
      surfaces: interopSheets.surfaces,
      summary: interopSheets.summary,
      integrationNotes: interopSheets.integrationNotes,
      docKey: interopSheets.docKey,
      docName: interopSheets.docName,
      contactName: interopSheets.contactName,
      stage: interopSheets.stage,
    })
    .from(interopSheets)
    .orderBy(desc(interopSheets.updatedAt))
    .limit(SHEET_READ_LIMIT)) as SheetRow[];
}

export const interopSheetsRouter = router({
  /**
   * Public: every sheet, with its class. The email that filed it is never
   * returned; people gave it to be contactable, not to be listed.
   */
  list: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { sheets: [], total: 0 };
    try {
      const rows = await readSheets(database);
      return {
        total: rows.length,
        sheets: rows.map((r) => ({
          id: r.id,
          toolId: r.toolId,
          toolName: r.toolName,
          summary: r.summary,
          integrationNotes: r.integrationNotes,
          contactName: r.contactName,
          stage: interopStageOf(r.stage),
          docName: r.docName,
          // Served through the existing /storage/* proxy, which streams from R2
          // rather than depending on the public asset domain being reachable.
          docUrl: r.docKey ? `/storage/${r.docKey}` : null,
          facets: toOverlapInput(r).facets,
        })),
      };
    } catch (err) {
      console.error("[interopSheets] list failed:", err);
      return { sheets: [], total: 0 };
    }
  }),

  /**
   * Public: where projects already meet, and what the group already agrees on.
   *
   * Computed from the sheets on every call rather than stored, so it can never
   * disagree with them. Exact, free, and checkable by eye in the session.
   */
  overlap: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { pairs: [], commonGround: [], sheetCount: 0 };
    try {
      const rows = await readSheets(database);
      const inputs = rows.map(toOverlapInput);
      return {
        sheetCount: inputs.length,
        pairs: computeOverlaps(inputs).slice(0, 100),
        commonGround: commonGround(inputs),
      };
    } catch (err) {
      console.error("[interopSheets] overlap failed:", err);
      return { pairs: [], commonGround: [], sheetCount: 0 };
    }
  }),

  /**
   * Public: file a sheet, which also submits the tool to the library.
   *
   * The tool row lands as `pending` so the public directory stays curated,
   * while the sheet shows on the Circle page straight away: the group can see
   * what is coming before an admin has looked at it.
   */
  submit: publicProcedure
    .use(rateLimited(SHEET_LIMIT))
    .input(z.object({
      toolName: z.string().min(1).max(200),
      websiteUrl: z.string().max(500),
      summary: z.string().max(2000).optional(),
      integrationNotes: z.string().max(6000).optional(),
      facets: facetsInput.optional(),
      contactName: z.string().max(120).optional(),
      email: z.string().email().max(320).optional(),
      voterKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
      doc: z.object({
        name: z.string().min(1).max(255),
        contentType: z.string().max(120),
        /** base64, bounded here and again after decoding. */
        data: z.string().max(Math.ceil(MAX_DOC_BYTES * 1.4)),
      }).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const toolName = normalizeTerm(input.toolName).slice(0, 200);
      if (!toolName) throw new TRPCError({ code: "BAD_REQUEST", message: "Your tool needs a name." });

      const websiteUrl = cleanRepoUrl(input.websiteUrl);
      if (!websiteUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "That link does not look reachable. Use an http or https address the group can open.",
        });
      }

      const facets = cleanFacets(input.facets ?? {});
      const summary = cleanProse(input.summary, 2000);
      const integrationNotes = cleanProse(input.integrationNotes, 6000);
      const contactName = cleanProse(input.contactName, 120);

      // ── the attachment, if there is one ──────────────────────────────
      let docKey: string | null = null;
      let docName: string | null = null;
      let docContentType: string | null = null;
      let docBytes: number | null = null;
      if (input.doc) {
        const ext = ALLOWED_DOC_TYPES[input.doc.contentType];
        if (!ext) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Attach a PDF, Markdown, plain text, JSON or YAML overview.",
          });
        }
        let buf: Buffer;
        try {
          buf = Buffer.from(input.doc.data, "base64");
        } catch {
          throw new TRPCError({ code: "BAD_REQUEST", message: "That file could not be read." });
        }
        if (!buf.length) throw new TRPCError({ code: "BAD_REQUEST", message: "That file is empty." });
        if (buf.length > MAX_DOC_BYTES) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `That file is ${(buf.length / 1024 / 1024).toFixed(1)}MB. The limit is 4MB.`,
          });
        }
        const key = `interop-sheets/${Date.now()}-${slugify(toolName) || "tool"}.${ext}`;
        try {
          // Stored as octet-stream because storagePut's allowlist is images,
          // PDFs and media; the real type is kept on the row and set on the
          // way back out, so the file downloads as what it is.
          const stored = await storagePut(key, buf, input.doc.contentType === "application/pdf" ? "application/pdf" : "application/octet-stream");
          docKey = stored.key;
          docName = cleanProse(input.doc.name, 255);
          docContentType = input.doc.contentType;
          docBytes = buf.length;
        } catch (err) {
          console.error("[interopSheets] doc upload failed:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "The file did not upload. The rest of your sheet was not saved, so try again." });
        }
      }

      // ── the canonical tool, pending for the public library ───────────
      const baseSlug = slugify(toolName) || `tool-${Date.now()}`;
      let toolId: number | null = null;
      try {
        const [existing] = (await database.execute(
          sql`SELECT id FROM regen_tools WHERE slug = ${baseSlug} LIMIT 1`,
        )) as unknown as [{ id: number }[]];
        if (existing?.[0]?.id) {
          toolId = existing[0].id;
          // Someone is filing a sheet for a tool the library already knows.
          // Leave the library row alone; the sheet is the new information.
        } else {
          await database.execute(sql`
            INSERT INTO regen_tools (name, slug, websiteUrl, shortSummary, longDescription, status)
            VALUES (${toolName}, ${baseSlug}, ${websiteUrl}, ${summary}, ${integrationNotes}, 'pending')
          `);
          const [row] = (await database.execute(sql`SELECT LAST_INSERT_ID() as id`)) as unknown as [{ id: number }[]];
          toolId = Number(row?.[0]?.id) || null;
        }
      } catch (err) {
        console.error("[interopSheets] tool insert failed:", err);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not record the tool." });
      }
      if (!toolId) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Could not record the tool." });

      // ── the sheet. One per tool, refiling updates it in place ────────
      await database
        .insert(interopSheets)
        .values({
          toolId,
          toolName,
          protocols: facets.protocols,
          dataFormats: facets.dataFormats,
          identityModels: facets.identityModels,
          surfaces: facets.surfaces,
          summary,
          integrationNotes,
          docKey,
          docName,
          docContentType,
          docBytes,
          voterKey: input.voterKey ?? null,
          email: input.email ?? null,
          contactName,
        })
        .onDuplicateKeyUpdate({
          set: {
            toolName,
            protocols: facets.protocols,
            dataFormats: facets.dataFormats,
            identityModels: facets.identityModels,
            surfaces: facets.surfaces,
            ...(summary ? { summary } : {}),
            ...(integrationNotes ? { integrationNotes } : {}),
            ...(docKey ? { docKey, docName, docContentType, docBytes } : {}),
            ...(contactName ? { contactName } : {}),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });

      return { ok: true as const, toolId };
    }),

  /**
   * Public: the standard so far.
   *
   * Two halves that mean different things. Common ground is computed: terms
   * several projects already name, which are facts about the sheets. Proposals
   * are somebody's argument that the group should adopt something it has not.
   */
  standard: publicProcedure.query(async () => {
    const database = await getDb();
    if (!database) return { commonGround: [], proposals: [] };
    try {
      const rows = await readSheets(database);
      const proposals = await database
        .select({
          id: interopProposals.id,
          axis: interopProposals.axis,
          term: interopProposals.term,
          rationale: interopProposals.rationale,
          status: interopProposals.status,
          contactName: interopProposals.contactName,
        })
        .from(interopProposals)
        .orderBy(desc(interopProposals.updatedAt))
        .limit(200);
      return { commonGround: commonGround(rows.map(toOverlapInput)), proposals };
    } catch (err) {
      console.error("[interopSheets] standard failed:", err);
      return { commonGround: [], proposals: [] };
    }
  }),

  /** Public: propose something for the shared standard. */
  propose: publicProcedure
    .use(rateLimited(PROPOSAL_LIMIT))
    .input(z.object({
      axis: z.enum(OVERLAP_AXES as [OverlapAxis, ...OverlapAxis[]]),
      term: z.string().min(1).max(120),
      rationale: z.string().max(2000).optional(),
      contactName: z.string().max(120).optional(),
      voterKey: z.string().regex(/^[A-Za-z0-9_-]{8,64}$/).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const term = normalizeTerm(input.term);
      const key = termKey(term);
      if (!term || !key) throw new TRPCError({ code: "BAD_REQUEST", message: "Name the thing you are proposing." });

      await database
        .insert(interopProposals)
        .values({
          axis: input.axis,
          term,
          termKey: key,
          rationale: cleanProse(input.rationale, 2000),
          contactName: cleanProse(input.contactName, 120),
          voterKey: input.voterKey ?? null,
        })
        .onDuplicateKeyUpdate({
          // Proposing the same thing again is not a second proposal; it keeps
          // the newest rationale and leaves the decision alone.
          set: {
            ...(input.rationale ? { rationale: cleanProse(input.rationale, 2000) } : {}),
            updatedAt: sql`CURRENT_TIMESTAMP`,
          },
        });
      return { ok: true as const };
    }),

  /** Admin: move a tool along the journey. The only transition that is a judgement. */
  setStage: adminProcedure
    .input(z.object({
      sheetId: z.number().int().positive(),
      stage: z.enum(["pending", "interoperable", "declined"]),
      note: z.string().max(2000).optional(),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await database
        .update(interopSheets)
        .set({
          stage: input.stage,
          stageNote: cleanProse(input.note, 2000),
          stagedAt: new Date(),
        })
        .where(eq(interopSheets.id, input.sheetId));
      return { ok: true as const };
    }),

  /** Admin: decide a proposal. */
  decideProposal: adminProcedure
    .input(z.object({
      proposalId: z.number().int().positive(),
      status: z.enum(["proposed", "adopted", "declined"]),
    }))
    .mutation(async ({ input }) => {
      const database = await getDb();
      if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await database
        .update(interopProposals)
        .set({ status: input.status, decidedAt: new Date() })
        .where(eq(interopProposals.id, input.proposalId));
      return { ok: true as const };
    }),

  /** Admin: every sheet with the contact behind it, for working the queue. */
  adminList: adminProcedure.query(async () => {
    const database = await getDb();
    if (!database) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return await database
      .select()
      .from(interopSheets)
      .orderBy(desc(interopSheets.updatedAt))
      .limit(SHEET_READ_LIMIT);
  }),
});
