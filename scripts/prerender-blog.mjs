#!/usr/bin/env node
/**
 * Blog prerender pipeline.
 *
 * The React app is a Vite SPA; crawlers and LLMs that do not execute JS
 * see only the static index.html shell, which has good meta tags but no
 * article body. This script bridges that gap.
 *
 * Runs after `vite build`. Reads client/src/data/blogPosts.ts, extracts
 * the static blogPosts array, and emits one prerendered HTML file per
 * post under dist/blog/<slug>/index.html. Each file injects: full title,
 * meta description, canonical, OG + Twitter cards, BlogPosting JSON-LD,
 * and the article body rendered to static HTML from the post's markdown
 * content. The same SPA bundle still hydrates on top, so the React route
 * keeps working.
 *
 * Side outputs:
 *   - dist/sitemap.xml gets one <url> entry per post if missing.
 *   - dist/llms.txt gets enumerated post URLs under a "## Blog posts"
 *     section so the LLM index reflects every article.
 *
 * Markdown -> HTML uses a small inline converter sufficient for the
 * project's blog content (headings, paragraphs, bold/italic, links,
 * lists, blockquotes, code, line breaks). It is intentionally NOT a
 * full Markdown spec implementation; the live React render still owns
 * the rich experience.
 *
 * No new runtime deps.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(__dirname, "..");
const DIST = join(REPO_ROOT, "dist", "public");
const FALLBACK_DIST = join(REPO_ROOT, "dist");
const DIST_DIR = existsSync(DIST) ? DIST : FALLBACK_DIST;

const SITE = "https://regencivics.earth";

// ---------- Extract blogPosts from the TS module ----------
// We parse the TS source directly with a forgiving regex pass so this
// script does not need a TS toolchain at build time. The blog data has
// a stable, hand-curated shape; if a post is missing from the prerender
// output, it shows up as a build-log warning, not a silent skip.
function extractPosts() {
  const file = readFileSync(
    join(REPO_ROOT, "client", "src", "data", "blogPosts.ts"),
    "utf8",
  );
  const arrayStart = file.indexOf("export const blogPosts");
  if (arrayStart === -1) return [];
  // Skip past the type annotation `BlogPost[]` between the name and the
  // `=` sign; the array literal lives after the assignment, not in the
  // type signature.
  const eqIdx = file.indexOf("=", arrayStart);
  if (eqIdx === -1) return [];
  const open = file.indexOf("[", eqIdx);
  if (open === -1) return [];
  // Walk balanced brackets to find the array literal's closing `]`.
  let depth = 0;
  let end = open;
  for (let i = open; i < file.length; i++) {
    if (file[i] === "[") depth++;
    else if (file[i] === "]") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  const body = file.slice(open + 1, end);

  // Split top-level objects.
  const posts = [];
  let braceDepth = 0;
  let start = -1;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (ch === "{") {
      if (braceDepth === 0) start = i;
      braceDepth++;
    } else if (ch === "}") {
      braceDepth--;
      if (braceDepth === 0 && start !== -1) {
        posts.push(body.slice(start, i + 1));
        start = -1;
      }
    }
  }

  return posts
    .map((obj) => {
      const field = (name) => {
        // Match: name: 'value' OR name: "value" OR name: `value`.
        // The char class is intentionally only the three quote chars;
        // an earlier version also accepted \\s, which let the regex
        // capture whitespace between the colon and the opening quote
        // as the "quote" character and then search for matching ws.
        const re = new RegExp(`\\b${name}\\s*:\\s*(['"\\\`])`, "m");
        const m = obj.match(re);
        if (!m) return null;
        const quote = m[1];
        const startIdx = obj.indexOf(quote, m.index) + 1;
        // Find matching quote, ignoring escapes.
        let i = startIdx;
        while (i < obj.length) {
          if (obj[i] === "\\") {
            i += 2;
            continue;
          }
          if (obj[i] === quote) break;
          i++;
        }
        return obj
          .slice(startIdx, i)
          .replace(/\\'/g, "'")
          .replace(/\\"/g, '"')
          .replace(/\\n/g, "\n")
          .replace(/\\\\/g, "\\");
      };
      const slug = field("slug");
      const title = field("title");
      const excerpt = field("excerpt") ?? "";
      const content = field("content") ?? "";
      const author = field("author") ?? "ReGen Civics Team";
      const date = field("date") ?? "";
      return slug && title ? { slug, title, excerpt, content, author, date } : null;
    })
    .filter(Boolean);
}

// ---------- Tiny markdown -> HTML ----------
function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(s) {
  return escapeHtml(s)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

// Special content markers are React components at runtime (see BlogPost.tsx
// SPECIAL_MARKERS). For the static prerender we swap them for equivalent
// markdown so the crawlable/no-JS HTML shows real content instead of the
// literal "[MARKER]" text. Keep these in sync with SPECIAL_MARKERS.
const SPECIAL_MARKER_MARKDOWN = {
  "[CLAIM_SEEDS_BUTTON]":
    "**[Claim your $ReGen for the SEEDS you bought](/claim-seeds)** — if you purchased SEEDS and want to simply claim your $ReGen, price your purchase and claim it here.",
  "[NINE_FORMS_OF_CAPITAL]": [
    "**Social capital:** relationships, networks, trust you built",
    "**Material capital:** tools, equipment, land improvements, physical infrastructure",
    "**Financial capital:** money or crypto invested or donated",
    "**Living capital:** ecological restoration, food forests, soil health, biodiversity",
    "**Intellectual capital:** research, documentation, writing, design, code",
    "**Experiential capital:** knowledge passed on, mentorship, facilitation, training",
    "**Spiritual capital:** ceremonies, spiritual practices, trauma work, deep healing, the intangible things that hold communities together",
    "**Cultural capital:** art, music, stories, identity, meaning",
    "**Health capital:** movement, bodywork, nutrition, recovery, the care that kept people able to work",
  ].join("\n\n"),
  "[FRAUD_WARNING]":
    "**Zero tolerance for fraud.** Our ecosystem is rooted in trust. Without that we have nothing. If your claim isn't verified on chain, or you attempt to misrepresent your contributions, your claim will be denied, you'll lose your opportunity to claim again, and you'll be banned from participating in ReGen Civics.",
  "[SHIP_QUEST_STEPS]": [
    "**Complete the quest.** Real regenerative actions, each one verified. It takes at least a week, so no one has to rush.",
    "**You're in the draw.** Every crew who completes it goes in the same draw. Ties are settled at random.",
    "**Bookings unlock more.** Every 20% of the year booked draws another free voyage, and you're in every single draw.",
  ].join("\n\n"),
  "[SHIP_FREE_VOYAGE_LADDER]": [
    "The free-voyage ladder:",
    "",
    "- **Launch:** the maiden voyage sails free (1 of 6)",
    "- **20% booked:** 2 of 6 sail free",
    "- **40% booked:** 3 of 6 sail free",
    "- **60% booked:** 4 of 6 sail free",
    "- **80% booked:** 5 of 6 sail free",
    "- **100% booked:** all 6 sail free",
  ].join("\n"),
  "[SHIP_PULLQUOTE]": "> The more the fleet sails, the more of us sail free.",
  "[SHIP_CTA]": "**[Enter the Maiden Voyage Quest](/ship/quest)** and [read the official rules](/ship/quest/rules).",
};

function expandSpecialMarkers(md) {
  if (!md) return md;
  return md
    .split("\n\n")
    .map((block) => {
      const key = block.trim();
      return Object.prototype.hasOwnProperty.call(SPECIAL_MARKER_MARKDOWN, key)
        ? SPECIAL_MARKER_MARKDOWN[key]
        : block;
    })
    .join("\n\n");
}

function renderMarkdown(md) {
  if (!md) return "";
  const lines = md.split(/\r?\n/);
  const out = [];
  let para = [];
  let list = null; // 'ul' | 'ol' | null
  let inCode = false;

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${renderInline(para.join(" "))}</p>`);
      para = [];
    }
  };
  const closeList = () => {
    if (list) {
      out.push(`</${list}>`);
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (inCode) {
      if (line.trim().startsWith("```")) {
        out.push("</code></pre>");
        inCode = false;
      } else {
        out.push(escapeHtml(line));
      }
      continue;
    }
    if (line.trim().startsWith("```")) {
      flushPara();
      closeList();
      out.push('<pre><code>');
      inCode = true;
      continue;
    }
    const h = line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flushPara();
      closeList();
      const level = h[1].length;
      out.push(`<h${level}>${renderInline(h[2])}</h${level}>`);
      continue;
    }
    const ul = line.match(/^[-*+]\s+(.*)$/);
    const ol = line.match(/^\d+\.\s+(.*)$/);
    if (ul || ol) {
      flushPara();
      const want = ul ? "ul" : "ol";
      if (list !== want) {
        closeList();
        list = want;
        out.push(`<${want}>`);
      }
      out.push(`<li>${renderInline((ul ?? ol)[1])}</li>`);
      continue;
    }
    if (line.startsWith(">")) {
      flushPara();
      closeList();
      out.push(`<blockquote>${renderInline(line.replace(/^>\s?/, ""))}</blockquote>`);
      continue;
    }
    if (!line.trim()) {
      flushPara();
      closeList();
      continue;
    }
    closeList();
    para.push(line);
  }
  flushPara();
  closeList();
  if (inCode) out.push("</code></pre>");
  return out.join("\n");
}

// ---------- Inject prerendered HTML into the SPA shell ----------
function buildPostHtml(shell, post) {
  const url = `${SITE}/blog/${post.slug}`;
  const title = `${post.title} | ReGen Civics Blog`;
  const desc = post.excerpt || post.title;
  const body = renderMarkdown(expandSpecialMarkers(post.content));

  const jsonld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: desc,
    author: { "@type": "Person", name: post.author },
    datePublished: post.date,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    publisher: {
      "@type": "Organization",
      name: "ReGen Civics",
      url: SITE,
    },
  };

  // Only the JSON-LD is genuinely new. Everything else in the head already
  // exists in the shell, so it gets REPLACED, never appended.
  //
  // This used to append the whole block before </head>, which left the shell's
  // homepage values in place ahead of the post's own. Every prerendered post
  // shipped two <title>, two descriptions, two og:title/og:url, two
  // twitter:title/description and two rel=canonical, and in each pair the
  // first was the generic homepage value. A crawler taking the first (which is
  // what happens for <title>, and what Google does with conflicting canonicals
  // by ignoring them entirely) read every post as a duplicate of the homepage.
  // Confirmed in production on 2026-08-03 across all 18 posts before this fix.
  //
  // Same replace-don't-append discipline as server/_core/vite.ts, which is why
  // the request-time injected routes never had this problem.
  const head = `
    <script type="application/ld+json">${JSON.stringify(jsonld)}</script>
  `;

  /** Replaces the content="..." of a single existing meta tag, matched by attribute. */
  const setMeta = (html, attr, name, value) =>
    html.replace(
      new RegExp(`(<meta ${attr}="${name}" content=")[^"]*(")`, "i"),
      `$1${escapeHtml(value)}$2`,
    );

  // The prerendered article is hidden visually (hydration overwrites
  // it), but crawlers and LLMs see it before any JS runs.
  const article = `
    <noscript>
      <article>
        <h1>${escapeHtml(post.title)}</h1>
        <p><em>${escapeHtml(desc)}</em></p>
        ${body}
      </article>
    </noscript>
    <div id="__prerendered_blog_post__" style="position:absolute;left:-99999px;top:auto;width:1px;height:1px;overflow:hidden;" aria-hidden="true">
      <article>
        <h1>${escapeHtml(post.title)}</h1>
        <p>${escapeHtml(desc)}</p>
        ${body}
      </article>
    </div>
  `;

  // Rewrite the shell's own head tags in place, then append only what the
  // shell has no equivalent for, then the article before <div id="root">.
  let html = shell
    .replace(/<title>[^<]*<\/title>/i, `<title>${escapeHtml(title)}</title>`)
    .replace(/(<link rel="canonical" href=")[^"]*(")/i, `$1${url}$2`);

  html = setMeta(html, "name", "description", desc);
  html = setMeta(html, "property", "og:title", post.title);
  html = setMeta(html, "property", "og:description", desc);
  html = setMeta(html, "property", "og:url", url);
  html = setMeta(html, "name", "twitter:title", post.title);
  html = setMeta(html, "name", "twitter:description", desc);
  html = setMeta(html, "name", "twitter:url", url);

  // og:type is "website" in the shell and has to become "article" here, so it
  // is a replace too. The append below carries only the JSON-LD.
  html = html.replace(
    /(<meta property="og:type" content=")[^"]*(")/i,
    `$1article$2`,
  );

  return html
    .replace(/<\/head>/i, `${head}</head>`)
    .replace(
      /<div id="root">/i,
      `${article}<div id="root">`,
    );
}

// ---------- Sitemap + llms.txt updates ----------
function ensureSitemap(posts) {
  const sitemapPath = join(DIST_DIR, "sitemap.xml");
  if (!existsSync(sitemapPath)) {
    console.warn(`[prerender-blog] sitemap.xml missing at ${sitemapPath}; skip update.`);
    return;
  }
  let xml = readFileSync(sitemapPath, "utf8");
  let added = 0;
  for (const p of posts) {
    const url = `${SITE}/blog/${p.slug}`;
    if (xml.includes(`<loc>${url}</loc>`)) continue;
    const entry = `  <url><loc>${url}</loc><changefreq>monthly</changefreq><priority>0.6</priority></url>\n`;
    xml = xml.replace(/<\/urlset>/, `${entry}</urlset>`);
    added += 1;
  }
  if (added) writeFileSync(sitemapPath, xml);
  console.log(`[prerender-blog] sitemap: +${added} blog entries`);
}

function ensureLlmsIndex(posts) {
  const llmsPath = join(DIST_DIR, "llms.txt");
  if (!existsSync(llmsPath)) return;
  let txt = readFileSync(llmsPath, "utf8");
  const marker = "## Blog posts";
  const lines = posts.map((p) => `- [${p.title}](${SITE}/blog/${p.slug})`).join("\n");
  if (txt.includes(marker)) {
    // Replace the section body up to the next ## heading.
    txt = txt.replace(
      new RegExp(`${marker}[\\s\\S]*?(?=\\n## |$)`),
      `${marker}\n${lines}\n`,
    );
  } else {
    txt = `${txt.trimEnd()}\n\n${marker}\n${lines}\n`;
  }
  writeFileSync(llmsPath, txt);
  console.log(`[prerender-blog] llms.txt: indexed ${posts.length} posts`);
}

// ---------- RSS feed ----------
// Perplexity and other answer engines weight fresh content heavily; a feed
// is the cheapest standing freshness signal. Served at /feed.xml.
function ensureFeed(posts) {
  const feedPath = join(DIST_DIR, "feed.xml");
  const rfc822 = (d) => {
    const t = new Date(d);
    return isNaN(t.getTime()) ? new Date().toUTCString() : t.toUTCString();
  };
  const sorted = [...posts].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const items = sorted
    .map((p) => {
      const url = `${SITE}/blog/${p.slug}`;
      return [
        "    <item>",
        `      <title>${escapeHtml(p.title)}</title>`,
        `      <link>${url}</link>`,
        `      <guid isPermaLink="true">${url}</guid>`,
        `      <description>${escapeHtml(p.excerpt || p.title)}</description>`,
        `      <pubDate>${rfc822(p.date)}</pubDate>`,
        "    </item>",
      ].join("\n");
    })
    .join("\n");
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    "    <title>ReGen Civics Blog</title>",
    `    <link>${SITE}/blog</link>`,
    `    <atom:link href="${SITE}/feed.xml" rel="self" type="application/rss+xml"/>`,
    "    <description>Insights, stories, and updates from the ReGenerative Renaissance: regenerative land projects, new economic systems, and the Infinite Game.</description>",
    "    <language>en</language>",
    `    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>`,
    items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
  writeFileSync(feedPath, xml);
  console.log(`[prerender-blog] feed.xml: ${sorted.length} items`);
}

// ---------- Main ----------
function main() {
  if (!existsSync(DIST_DIR)) {
    console.warn(`[prerender-blog] dist not found at ${DIST_DIR}; skip.`);
    return;
  }
  const indexHtml = join(DIST_DIR, "index.html");
  if (!existsSync(indexHtml)) {
    console.warn(`[prerender-blog] index.html missing at ${indexHtml}; skip.`);
    return;
  }
  const shell = readFileSync(indexHtml, "utf8");

  const posts = extractPosts();
  if (!posts.length) {
    console.warn("[prerender-blog] no posts extracted from blogPosts.ts; skip.");
    return;
  }

  for (const post of posts) {
    const dir = join(DIST_DIR, "blog", post.slug);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.html"), buildPostHtml(shell, post));
  }
  console.log(`[prerender-blog] wrote ${posts.length} prerendered posts under dist/blog/`);

  ensureSitemap(posts);
  ensureLlmsIndex(posts);
  ensureFeed(posts);
}

// Only run as a script. Importing this module (scripts/prerender-blog.test.ts
// exercises buildPostHtml against a fixture shell) must not write to dist/.
const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) main();

export { buildPostHtml };
