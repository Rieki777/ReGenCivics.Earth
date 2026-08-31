/**
 * Church of the Regenerative Earth, rendered for readers that do not run JS.
 *
 * THE DEFECT THIS CLOSES. `core.regencivics.earth` is a real church with a real
 * EIN, and until now every crawler that fetched it got the ReGen Civics title,
 * the ReGen Civics description and `"@type": "Organization"`. Measured on
 * production 2026-08-30: zero occurrences of "Church of the Regenerative Earth"
 * in the served HTML of either `core.regencivics.earth/` or `/core`.
 *
 * Why it happened, and it is one line: `isCoreHost()` in client/src/App.tsx
 * reads `window.location.hostname`, so the entire church app is chosen in the
 * BROWSER. A fetch without JS never reaches that branch. The site had the pages,
 * the copy and even a hand-written JSON-LD constant; what it lacked was anybody
 * on the server knowing which host had been asked for.
 *
 * `resolveCrawlerContent` keyed on path alone, so `core.regencivics.earth/` and
 * `regencivics.earth/` resolved to the same entry by construction. Host is now
 * part of the key.
 *
 * THE ENTITY MODEL, per Rye's correction of 2026-08-30, because getting this
 * wrong is worse than saying nothing:
 *   - Church of the Regenerative Earth (CORE) is the church and operating
 *     entity. It exists. It gets Church structured data.
 *   - ReGen Civics is the platform and alliance. It is NOT the church.
 *   - The Fund has no legal entity and gets NO structured data at all. An
 *     unformed entity has no schema. Nothing in this file mentions it.
 *
 * The prose here is lifted from the pages themselves rather than written fresh,
 * so a crawler and a human read the same sentences. If a page's copy changes,
 * this is stale and should be corrected, not paraphrased around.
 */

/** Mirrors client/src/App.tsx `isCoreHost`, which tests `hostname.startsWith("core.")`. */
export function isCoreHost(host: string | undefined | null): boolean {
  if (!host) return false;
  // Strip the port; Host headers carry one in dev and behind some proxies.
  const hostname = String(host).split(":")[0]!.trim().toLowerCase();
  return hostname.startsWith("core.");
}

const CHURCH = {
  name: "Church of the Regenerative Earth",
  alt: "CORE",
  url: "https://core.regencivics.earth",
  description:
    "A 508(c)(1)(a) faith ministry of land-based regeneration, community, and service to all life. The spiritual heart of ReGen Civics.",
};

/**
 * Church, not Organization. schema.org/Church is a subtype of PlaceOfWorship,
 * which is what this is. The client constant said Organization, which is true
 * of every incorporated body on earth and therefore says nothing.
 */
export const CHURCH_JSONLD: Record<string, unknown> = {
  "@context": "https://schema.org",
  "@type": "Church",
  name: CHURCH.name,
  alternateName: CHURCH.alt,
  url: CHURCH.url,
  description: CHURCH.description,
  foundingDate: "2026",
  taxID: "42-3198293",
  sameAs: ["https://regencivics.earth"],
};

export interface CorePage {
  title: string;
  description: string;
  bodyHtml: string;
}

const page = (title: string, description: string, bodyHtml: string): CorePage => ({
  // Do not suffix the church's name onto the church's name. The home entry's
  // title IS "Church of the Regenerative Earth", and the naive template shipped
  // "Church of the Regenerative Earth | Church of the Regenerative Earth" to
  // production, which is what a search result would have shown.
  title: title === CHURCH.name ? title : `${title} | ${CHURCH.name}`,
  description,
  bodyHtml,
});

export const CORE_PAGES: Record<string, CorePage> = {
  "/": page(
    "Church of the Regenerative Earth",
    CHURCH.description,
    `<article>
      <h1>Church of the Regenerative Earth</h1>
      <p>${CHURCH.description}</p>
      <p>The universe is a single living whole. Every person in our community is the Earth choosing to tend itself. There is only us.</p>
      <p>Living systems grow toward complexity, resilience, and abundance. We regenerate rather than extract. We complexify rather than dominate.</p>
      <p>Consciousness grows by learning, sharing, and creating side by side. Every gathering is the Earth learning through us.</p>
      <p>Read <a href="/faith">what we believe</a>, see <a href="/programs">our programs</a>, meet <a href="/elders">our elders</a>, or <a href="/get-involved">find your place here</a>.</p>
    </article>`,
  ),
  "/faith": page(
    "What we believe",
    "We are the Earth, choosing to heal itself. The universe exists and evolves as a single undividable wholeness.",
    `<article>
      <h1>We are the Earth, choosing to heal itself</h1>
      <p>The universe exists and evolves as a single undividable wholeness. We are not separate from the Earth, from each other, or from the cosmos.</p>
      <p>This is the faith of the ${CHURCH.name}, a 508(c)(1)(a) faith ministry. See <a href="/programs">how we practise it</a> and <a href="/transparency">how we are held to account</a>.</p>
    </article>`,
  ),
  "/programs": page(
    "Programs",
    "Worship you can put your hands into: land stewardship, food forests, and community practice.",
    `<article>
      <h1>Worship you can put your hands into</h1>
      <p>Our programs are the practice of the faith rather than a description of it: tending land, growing food, and gathering in service to all life.</p>
      <p>See <a href="/faith">what we believe</a> or <a href="/get-involved">join us</a>.</p>
    </article>`,
  ),
  "/elders": page(
    "Elders",
    "We honor the wisdom keepers: the elders who carry and pass on the practice.",
    `<article>
      <h1>We honor the wisdom keepers</h1>
      <p>Elders carry the practice and pass it on. Their guidance shapes how the church tends land and community.</p>
      <p>See <a href="/faith">what we believe</a> and <a href="/transparency">how decisions are made</a>.</p>
    </article>`,
  ),
  "/donate": page(
    "Giving",
    "Giving is worship. Your giving helps steward and acquire land, plant food forests, and hold ground in trust for the Earth.",
    `<article>
      <h1>Giving is worship</h1>
      <p>Your giving helps steward and acquire land, plant food forests, and hold ground in trust for the Earth and the generations to come.</p>
      <p>See <a href="/transparency">how we account for it</a>.</p>
    </article>`,
  ),
  "/transparency": page(
    "Transparency",
    "Held in the open. Decisions are made by consent in circles, with our shared values as the guide.",
    `<article>
      <h1>Held in the open</h1>
      <p>We use a sociocratic model of governance. Decisions are made by consent in circles, with our shared values as the guide. No single person decides for everyone.</p>
      <p>See <a href="/elders">our elders</a> and <a href="/donate">how giving is used</a>.</p>
    </article>`,
  ),
  "/get-involved": page(
    "Get involved",
    "There is a place for you here. Everything begins at ReGen Civics, our living home and gathering place.",
    `<article>
      <h1>There is a place for you here</h1>
      <p>Everything begins at ReGen Civics, our living home and gathering place. Create your profile and step into the community where the church lives and grows.</p>
      <p>Read <a href="/faith">what we believe</a> first, if you would rather.</p>
    </article>`,
  ),
};

/**
 * The crawler entry for a path on the church host, or null.
 *
 * Returns null rather than a generic page for an unknown path: an invented
 * entry for a route that does not exist is worse than no entry, because it
 * reads as a real page to the one reader that cannot tell.
 */
export function getCorePageContent(reqPath: string): (CorePage & { jsonld: Record<string, unknown> }) | null {
  const clean = (reqPath || "/").split("?")[0]!.replace(/\/+$/, "") || "/";
  const found = CORE_PAGES[clean];
  if (!found) return null;
  return { ...found, jsonld: CHURCH_JSONLD };
}
