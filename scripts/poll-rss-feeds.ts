/**
 * Poll RSS/Atom feeds registered in entity_rss_feeds and post new items
 * as forum replies attributed to a system user.
 *
 * Run: npx tsx scripts/poll-rss-feeds.ts
 * Schedule: daily via Railway cron or cron job
 */

import * as mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL is required");

// Simple RSS/Atom feed parser - avoids adding a dependency
async function parseFeed(url: string): Promise<Array<{ guid: string; title: string; link: string; pubDate?: string }>> {
  const res = await fetch(url, {
    headers: { "User-Agent": "ReGenCivics-FeedPoller/1.0" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error(`Feed fetch failed: ${res.status} ${url}`);
  const xml = await res.text();

  // Parse RSS items
  const items: Array<{ guid: string; title: string; link: string; pubDate?: string }> = [];

  // Match <item> blocks (RSS 2.0)
  const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/gi);
  for (const match of itemMatches) {
    const block = match[1];
    const title = block.match(/<title><!\[CDATA\[(.*?)\]\]>|<title>(.*?)<\/title>/i)?.[1] ?? block.match(/<title>(.*?)<\/title>/i)?.[1] ?? "Untitled";
    const link = block.match(/<link>(.*?)<\/link>/i)?.[1] ?? block.match(/<guid>(.*?)<\/guid>/i)?.[1] ?? "";
    const guid = block.match(/<guid[^>]*>(.*?)<\/guid>/i)?.[1] ?? link;
    const pubDate = block.match(/<pubDate>(.*?)<\/pubDate>/i)?.[1];
    if (guid && link) items.push({ guid: guid.trim(), title: title.trim(), link: link.trim(), pubDate });
  }

  // Match <entry> blocks (Atom)
  if (items.length === 0) {
    const entryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi);
    for (const match of entryMatches) {
      const block = match[1];
      const title = block.match(/<title[^>]*>(.*?)<\/title>/is)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/s, "$1") ?? "Untitled";
      const link = block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ?? "";
      const guid = block.match(/<id>(.*?)<\/id>/i)?.[1] ?? link;
      const pubDate = block.match(/<updated>(.*?)<\/updated>/i)?.[1] ?? block.match(/<published>(.*?)<\/published>/i)?.[1];
      if (guid && link) items.push({ guid: guid.trim(), title: title.trim(), link: link.trim(), pubDate });
    }
  }

  return items;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL!);
  console.log("Connected to DB");

  try {
    // Get all active feeds with their associated forum post IDs
    const [feeds] = await conn.execute<mysql.RowDataPacket[]>(
      "SELECT f.*, o.forumPostId FROM entity_rss_feeds f LEFT JOIN organisations o ON f.entityId = o.orgId WHERE f.isActive = 1"
    );

    let totalNew = 0;

    for (const feed of feeds) {
      try {
        console.log(`Polling: ${feed.label ?? feed.feedUrl}`);
        const items = await parseFeed(feed.feedUrl);
        if (items.length === 0) {
          console.log("  No items found");
          continue;
        }

        // Find items newer than lastItemGuid
        const forumPostId = feed.forumPostId;
        if (!forumPostId) {
          console.log("  No forum post linked - skipping reply insertion");
          // Still update lastFetchedAt
          await conn.execute(
            "UPDATE entity_rss_feeds SET lastFetchedAt = NOW() WHERE id = ?",
            [feed.id]
          );
          continue;
        }

        // Check which items are already posted (by guid stored in reply body as a comment)
        const [existing] = await conn.execute<mysql.RowDataPacket[]>(
          "SELECT body FROM forumReplies WHERE postId = ? AND body LIKE '%[rss-guid:%'",
          [forumPostId]
        );
        const postedGuids = new Set(
          existing.map((r: mysql.RowDataPacket) => {
            const m = (r.body as string).match(/\[rss-guid:([^\]]+)\]/);
            return m ? m[1] : null;
          }).filter(Boolean)
        );

        let newCount = 0;
        // Insert newest items first - but cap at 5 per run to avoid spam
        for (const item of items.slice(0, 5)) {
          if (postedGuids.has(item.guid)) continue;

          const body = `**[${item.title}](${item.link})**\n\nNew update from ${feed.label ?? "feed"}.\n\n[rss-guid:${item.guid}]`;

          // Use system user ID 1 as author (or find a system/bot user)
          await conn.execute(
            "INSERT INTO forumReplies (postId, authorId, body, createdAt) VALUES (?, 1, ?, NOW())",
            [forumPostId, body]
          );
          newCount++;
          totalNew++;
        }

        // Update lastFetchedAt
        await conn.execute(
          "UPDATE entity_rss_feeds SET lastFetchedAt = NOW() WHERE id = ?",
          [feed.id]
        );

        console.log(`  Posted ${newCount} new item(s)`);
      } catch (err) {
        console.error(`  Error polling ${feed.feedUrl}:`, err);
      }
    }

    console.log(`Done. ${totalNew} total new items posted.`);
  } finally {
    await conn.end();
  }
}

main().catch(console.error);
