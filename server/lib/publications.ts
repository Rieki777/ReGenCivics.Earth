/**
 * Compose to Publish (the Harvest Phase 5; plan s5b).
 *
 * One idea in, a full package out: an article, per-channel social posts,
 * image options, and optionally the hardened email, grouped as one
 * Publication with per-surface state. The safety spine:
 *
 *  - the composed idea text is UNTRUSTED (wrapped as data in every prompt)
 *  - drafting grounds in retrieved sources + the Worldview Pack voice
 *  - each surface has its own approve step; publish never fires from a
 *    draft, and publishing an already-published target is a no-op
 *  - the article goes out as a hidden preview at a private URL first; the
 *    voice grader must pass before it can go public
 *  - social goes through Buffer (the aggregator already wired in this repo),
 *    never five hand-rolled platform integrations
 */
import crypto from "crypto";
import { and, desc, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { getDb } from "../db";
import {
  creationItems, harvestIdeas, publications, publicationTargets,
  publicationImages, publishedArticles, sourceIndex,
} from "../../drizzle/schema";
import { draftChannel, upsertDraft, HARVEST_CHANNELS, type HarvestChannel } from "./harvest";
import { gradeVoice } from "./voice-grader";
import { invokeLLM } from "../_core/llm";
import { generateImage, buildImagePrompt } from "../_core/imageGeneration";
import { getSiteSetting } from "../db";
import { ENV } from "../_core/env";
import { logger } from "../_core/logger";

const log = logger("publications");

export const PUBLICATION_SURFACES = ["site", "linkedin", "facebook", "instagram", "threads_x", "email"] as const;
export type PublicationSurface = (typeof PUBLICATION_SURFACES)[number];

const SURFACE_TO_CHANNEL: Record<Exclude<PublicationSurface, "site">, HarvestChannel> = {
  linkedin: "linkedin",
  facebook: "facebook",
  instagram: "instagram",
  threads_x: "threads_x",
  email: "newsletter",
};

function slugify(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 120) || "untitled";
}

/**
 * Deterministic related-material retrieval: rank existing ideas by word
 * overlap with the composed text (title + summary), zero tokens. The curated
 * cloud mirror is the corpus; full-vault retrieval stays local (ADR-39).
 */
export async function findRelatedMaterial(ownerId: number, text: string, limit = 6): Promise<{ ideas: Array<{ id: number; ideaRef: string; title: string; sourceRefs: unknown }>; sourceRefs: string[] }> {
  const db = await getDb();
  if (!db) return { ideas: [], sourceRefs: [] };
  const words = new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3));
  if (words.size === 0) return { ideas: [], sourceRefs: [] };
  const candidates = await db.select().from(harvestIdeas)
    .where(and(eq(harvestIdeas.ownerId, ownerId)))
    .orderBy(desc(harvestIdeas.ripeness))
    .limit(500);
  const scored = candidates
    .map((idea) => {
      const hay = `${idea.title} ${idea.summary ?? ""}`.toLowerCase();
      let hits = 0;
      for (const w of words) if (hay.includes(w)) hits++;
      return { idea, score: hits / words.size };
    })
    .filter((s) => s.score > 0.12)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
  const sourceRefs = Array.from(new Set(scored.flatMap(({ idea }) =>
    Array.isArray(idea.sourceRefs) ? (idea.sourceRefs as unknown[]).filter((r): r is string => typeof r === "string") : [],
  )));
  return {
    ideas: scored.map(({ idea }) => ({ id: idea.id, ideaRef: idea.ideaRef, title: idea.title, sourceRefs: idea.sourceRefs })),
    sourceRefs,
  };
}

/**
 * Compose: create the idea row, the publication, all surface targets, and
 * draft every channel plus the article, grounded in the retrieved sources.
 */
export async function composePublication(ownerId: number, input: { text: string; extraSourceRefs?: string[] }): Promise<{ publicationId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");

  const firstLine = input.text.trim().split("\n")[0].slice(0, 200);
  const related = await findRelatedMaterial(ownerId, input.text);
  const sourceRefs = Array.from(new Set([...(input.extraSourceRefs ?? []), ...related.sourceRefs])).slice(0, 30);

  const ideaRef = `compose:${crypto.randomUUID()}`;
  await db.insert(harvestIdeas).values({
    ownerId,
    ideaRef,
    title: firstLine,
    summary: input.text.slice(0, 8000),
    themes: [],
    ripeness: 1,
    whyNow: "Composed by Rye",
    sourceRefs,
    status: "developed",
    draftedAt: new Date(),
  });
  const [idea] = await db.select().from(harvestIdeas)
    .where(and(eq(harvestIdeas.ownerId, ownerId), eq(harvestIdeas.ideaRef, ideaRef)));

  const pubResult = await db.insert(publications).values({
    ownerId,
    ideaId: idea.id,
    title: firstLine,
    sourceRefs,
    status: "draft",
  });
  const header = pubResult as unknown as { insertId?: number } & Array<{ insertId?: number }>;
  const publicationId = header?.[0]?.insertId ?? header?.insertId ?? 0;
  if (!publicationId) throw new Error("publication insert failed");

  // Draft every surface. The article channel carries the site surface.
  for (const surface of PUBLICATION_SURFACES) {
    const channel: HarvestChannel = surface === "site" ? "article" : SURFACE_TO_CHANNEL[surface];
    let itemId: number | null = null;
    let draftBody = "";
    try {
      const { body } = await draftChannel(idea, channel);
      draftBody = body;
      itemId = await upsertDraft(idea, channel, body);
    } catch (err) {
      log.error(`compose draft failed for ${surface}`, err instanceof Error ? err : undefined);
    }

    // Fact-check the draft against the material it was composed from, so the
    // review screen opens with verdicts already in place. Fail-soft: a checker
    // error leaves the surface 'unverified', which the approve gate reads as
    // not-yet-checked rather than as a pass.
    let verificationStatus: "unverified" | "passed" | "flagged" = "unverified";
    let verificationFlags: Array<{ claim: string; problem: string; severity: "block" | "warn" }> | null = null;
    let verifiedAt: Date | null = null;
    if (draftBody) {
      try {
        const { verifyDraft } = await import("./content-verify");
        const result = await verifyDraft({ body: draftBody, sourceText: input.text });
        verificationStatus = result.status;
        verificationFlags = result.flags;
        verifiedAt = new Date();
      } catch (err) {
        log.error(`compose verify failed for ${surface}`, err instanceof Error ? err : undefined);
      }
    }

    await db.insert(publicationTargets).values({
      publicationId,
      surface,
      itemId,
      status: "draft",
      verificationStatus,
      verificationFlags,
      verifiedAt,
    }).onDuplicateKeyUpdate({ set: { itemId, verificationStatus, verificationFlags, verifiedAt } });
  }

  log.info(`publication ${publicationId} composed (${sourceRefs.length} sources)`);
  return { publicationId };
}

/** Alt text for a generated image, one cheap call, capped. */
async function altTextFor(title: string, prompt: string): Promise<string> {
  try {
    const res = await invokeLLM({
      messages: [
        { role: "system", content: "Write one concise, literal alt text (under 200 characters) describing the image for a screen reader. No 'image of'. Return only the alt text." },
        { role: "user", content: `The image illustrates: ${title}\nIt was generated from: ${prompt.slice(0, 400)}` },
      ],
      maxTokens: 100,
      task: "light",
    });
    const text = (res.choices[0]?.message?.content ?? "").trim().replace(/^"|"$/g, "");
    if (text) return text.slice(0, 500);
  } catch {
    // fall through
  }
  return `Illustration: ${title}`.slice(0, 500);
}

/**
 * Generate 2 image options for a slot in the house visual identity
 * (BASE_THEME in imageGeneration.ts is the code twin of the vault's Visual
 * Identity profile). Each option carries alt text. Fail-soft: returns []
 * when the image worker is not configured.
 */
export async function generateImageOptions(ownerId: number, publicationId: number, slot: "hero" | "inline", title: string, angleHint?: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (!ENV.imageGenWorkerUrl || !ENV.imageGenSecret) {
    log.info("image worker not configured; skipping generation");
    return 0;
  }
  const variations = slot === "hero"
    ? ["wide establishing shot", "intimate close human moment"]
    : ["detail vignette", "pattern and texture study"];
  let created = 0;
  for (const [n, variation] of variations.entries()) {
    try {
      const prompt = buildImagePrompt("blog", title, `${variation}${angleHint ? `, ${angleHint}` : ""}`);
      const result = await generateImage({
        contentType: "blog",
        contentId: `publication-${publicationId}-${slot}-${n}`,
        contextText: prompt,
        temp: false,
      } as Parameters<typeof generateImage>[0]);
      const alt = await altTextFor(title, prompt);
      await db.insert(publicationImages).values({
        ownerId,
        publicationId,
        slot,
        r2Key: (result as { key?: string }).key ?? "",
        url: (result as { url: string }).url,
        altText: alt,
        prompt,
        chosen: 0,
      });
      created++;
    } catch (err) {
      log.error(`image option ${n} failed for publication ${publicationId}`, err instanceof Error ? err : undefined);
    }
  }
  return created;
}

/** The full review payload: publication, targets, their items, images. */
export async function getPublicationReview(ownerId: number, publicationId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [publication] = await db.select().from(publications)
    .where(and(eq(publications.ownerId, ownerId), eq(publications.id, publicationId)));
  if (!publication) return null;
  const targets = await db.select().from(publicationTargets)
    .where(eq(publicationTargets.publicationId, publicationId));
  const itemIds = targets.map((t) => t.itemId).filter((v): v is number => typeof v === "number");
  const items = itemIds.length > 0
    ? await db.select().from(creationItems).where(and(eq(creationItems.ownerId, ownerId), inArray(creationItems.id, itemIds)))
    : [];
  const images = await db.select().from(publicationImages)
    .where(and(eq(publicationImages.ownerId, ownerId), eq(publicationImages.publicationId, publicationId)));
  const [article] = await db.select().from(publishedArticles)
    .where(and(eq(publishedArticles.ownerId, ownerId), eq(publishedArticles.publicationId, publicationId)));
  return { publication, targets, items, images, article: article ?? null };
}

/**
 * Published surfaces that still have no weekly note. This is the whole
 * analytics loop: no scraping, no vanity metrics, just the question "did this
 * land" asked about things that actually went out.
 *
 * It deliberately rides the harvest-digest cron's existing weekly rhythm
 * rather than inventing a second schedule. The 28-day window means a note is
 * still askable a few weeks later, and stops being nagged about after that.
 */
export async function listTargetsAwaitingNote(ownerId: number, sinceDays = 28) {
  const db = await getDb();
  if (!db) return [];
  const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
  return db
    .select({
      publicationId: publicationTargets.publicationId,
      surface: publicationTargets.surface,
      publishedAt: publicationTargets.publishedAt,
      title: publications.title,
    })
    .from(publicationTargets)
    .innerJoin(publications, eq(publications.id, publicationTargets.publicationId))
    .where(and(
      eq(publications.ownerId, ownerId),
      eq(publicationTargets.status, "published"),
      // Cleared notes come back as empty strings, not NULL.
      or(isNull(publicationTargets.weeklyNote), eq(publicationTargets.weeklyNote, "")),
      gte(publicationTargets.publishedAt, since),
    ))
    .orderBy(desc(publicationTargets.publishedAt))
    .limit(50);
}

async function refreshPublicationStatus(publicationId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const targets = await db.select().from(publicationTargets).where(eq(publicationTargets.publicationId, publicationId));
  const published = targets.filter((t) => t.status === "published").length;
  const status = published === 0 ? "draft" : published === targets.length ? "published" : "partially_published";
  await db.update(publications).set({ status }).where(eq(publications.id, publicationId));
}

/**
 * Publish one target. Requires status 'approved' (never 'draft'), is
 * idempotent (published targets are a no-op), and each surface enforces its
 * own gate:
 *  - site: creates/updates the hidden-preview article; a SECOND call with
 *    makePublic once the article exists flips it public after the voice
 *    grader passes.
 *  - social surfaces: one Buffer update per surface, external id recorded.
 *  - email: never fired from here; the hardened confirm-token flow on the
 *    newsletter item is the only send path. This marks the seam only.
 */
export async function publishTarget(ownerId: number, publicationId: number, surface: PublicationSurface, opts: { makePublic?: boolean; profileId?: string } = {}): Promise<{ status: string; externalUrl?: string | null; previewToken?: string; note?: string }> {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const review = await getPublicationReview(ownerId, publicationId);
  if (!review) throw new Error("Publication not found");
  const target = review.targets.find((t) => t.surface === surface);
  if (!target) throw new Error("Target not found");
  if (target.status === "published") {
    return { status: "published", externalUrl: target.externalUrl, note: "Already published; nothing re-fired." };
  }
  if (target.status !== "approved") {
    throw new Error("This surface is not approved yet. Approve it on the review screen first; nothing publishes from a raw draft.");
  }
  const item = review.items.find((i) => i.id === target.itemId);
  if (!item?.body?.trim()) throw new Error("The target has no text.");

  if (surface === "site") {
    const lines = item.body.trim().split("\n");
    const title = (lines[0] ?? review.publication.title).replace(/^#+\s*/, "").trim().slice(0, 300);
    const content = lines.slice(1).join("\n").trim() || item.body.trim();
    const hero = review.images.find((im) => im.slot === "hero" && im.chosen === 1) ?? null;

    if (!review.article) {
      // First publish call: hidden preview at a private URL.
      const previewToken = crypto.randomUUID();
      let slug = slugify(title);
      const clash = await db.select({ id: publishedArticles.id }).from(publishedArticles).where(eq(publishedArticles.slug, slug)).limit(1);
      if (clash.length > 0) slug = `${slug}-${publicationId}`;
      await db.insert(publishedArticles).values({
        ownerId,
        publicationId,
        slug,
        title,
        excerpt: content.replace(/[#*_>\[\]]/g, "").split("\n").filter(Boolean).join(" ").slice(0, 300),
        content,
        heroImageUrl: hero?.url ?? null,
        heroImageAlt: hero?.altText ?? null,
        tags: ["harvest"],
        previewToken,
        status: "preview",
      });
      return { status: "approved", previewToken, note: `Hidden preview created at /blog/${slug}?preview=${previewToken}. Review it, then publish again with makePublic.` };
    }

    if (!opts.makePublic) {
      return { status: "approved", previewToken: review.article.previewToken, note: "Preview already exists. Pass makePublic to go live." };
    }
    const flags = gradeVoice(`${review.article.title}\n\n${review.article.content}`);
    if (flags.length > 0) {
      throw new Error(`The voice grader flags this article; fix before it goes public: ${flags.map((f) => f.rule).join(", ")}`);
    }
    await db.update(publishedArticles)
      .set({ status: "public", publishedAt: new Date(), content, title, heroImageUrl: hero?.url ?? review.article.heroImageUrl, heroImageAlt: hero?.altText ?? review.article.heroImageAlt })
      .where(eq(publishedArticles.id, review.article.id));
    const externalUrl = `${ENV.appUrl.replace(/\/$/, "")}/blog/${review.article.slug}`;
    await db.update(publicationTargets)
      .set({ status: "published", publishedAt: new Date(), externalUrl })
      .where(eq(publicationTargets.id, target.id));
    await db.update(creationItems).set({ status: "shipped", postedAt: new Date() }).where(eq(creationItems.id, item.id));
    await refreshPublicationStatus(publicationId);
    return { status: "published", externalUrl };
  }

  if (surface === "email") {
    return {
      status: target.status,
      note: "Email goes out only through the hardened send on the newsletter draft (edit it, preview, confirm). This target flips to published when that send completes.",
    };
  }

  // Social surfaces via Buffer.
  const token = (await getSiteSetting("buffer_access_token")) || ENV.bufferAccessToken;
  if (!token) throw new Error("Buffer is not connected. Add the access token in admin (Buffer settings) and pick the profile.");
  if (!opts.profileId) throw new Error("Pick the Buffer profile for this channel first.");
  const params = new URLSearchParams();
  params.append("access_token", token);
  params.append("profile_ids[]", opts.profileId);
  params.append("text", item.body.slice(0, 5000));
  params.append("now", "true");
  const response = await fetch("https://api.bufferapp.com/1/updates/create.json", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!response.ok) {
    await db.update(publicationTargets).set({ status: "failed" }).where(eq(publicationTargets.id, target.id));
    throw new Error(`Buffer rejected the post (${response.status}). The target is marked failed; approve again to retry.`);
  }
  const data = await response.json() as { updates?: Array<{ id?: string }>; update?: { id?: string } };
  const updateId = data.update?.id ?? data.updates?.[0]?.id ?? null;
  await db.update(publicationTargets)
    .set({ status: "published", publishedAt: new Date(), externalUrl: updateId ? `buffer:${updateId}` : null })
    .where(eq(publicationTargets.id, target.id));
  await db.update(creationItems).set({ status: "shipped", postedAt: new Date() }).where(eq(creationItems.id, item.id));
  await refreshPublicationStatus(publicationId);
  log.info(`publication ${publicationId} ${surface} published via Buffer`);
  return { status: "published", externalUrl: updateId ? `buffer:${updateId}` : null };
}
