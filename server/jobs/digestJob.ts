// Runs weekly: pulls top forum threads by engagement, generates digest, saves to DB, sends to subscribers
import { invokeLLM } from "../_core/llm";
import * as db from "../db";
import { sendEmail, APP_BASE_URL } from "../_core/email";
import { audienceForTopic, managePreferencesUrl } from "../lib/emailPrefs";
import { newsletterLegalFooterHtml } from "../../shared/letterHtml";
import {
  WHATSAPP_COMMUNITY_URL,
  DISCORD_INVITE_URL,
  YOUTUBE_CHANNEL_URL,
  HYLO_SEEDS_URL,
  HOLOS_REGEN_CIVICS_URL,
} from "../../shared/communityLinks";
import { ENV } from "../_core/env";

const DIGEST_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
// Extra guard: if a digest was sent within the last 2 hours, treat it as a duplicate
// (covers Railway redeploy race conditions where two instances both start up)
const DUPLICATE_GUARD_MS = 2 * 60 * 60 * 1000; // 2 hours

// Curated blog posts for fallback sections — rotated by week so each digest
// surfaces different content. Keep this list in sync with blogPosts.ts.
const BLOG_HIGHLIGHTS = [
  { title: "What Makes ReGen Civics Different: 7 Unique Features", slug: "what-makes-regen-civics-different" },
  { title: "Introducing Games and Quests: Play Your Way to Regeneration", slug: "introducing-games-and-quests" },
  { title: "Getting Investment Into Your Land Project Through ReGen Civics", slug: "getting-investment-through-regen-civics" },
  { title: "What Makes a Land Project a Good Investment: The Four Pillars", slug: "what-makes-land-proje
