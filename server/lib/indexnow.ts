/**
 * IndexNow: instant URL submission to Bing (and other IndexNow engines).
 *
 * Bing's index feeds ChatGPT search citations (~87% overlap between Bing
 * top-10 and ChatGPT citations), so pinging IndexNow when content is
 * created gets new pages in front of AI answer engines within hours
 * instead of weeks.
 *
 * The key is intentionally public: IndexNow verifies ownership by fetching
 * https://<host>/<key>.txt, which is served from client/public/. No secret.
 *
 * Fire-and-forget by design: never let an IndexNow failure affect the
 * mutation that triggered it.
 */

export const INDEXNOW_KEY = "7c2e9a41f5d84b6c8e3a1f9b2d5c7e40";
const HOST = "regencivics.earth";

export function pingIndexNow(paths: string[]): void {
  // Only ping from production; dev/test content does not exist publicly.
  if (process.env.NODE_ENV !== "production") return;
  if (!paths.length) return;

  const urlList = paths.map((p) => `https://${HOST}${p.startsWith("/") ? p : `/${p}`}`);

  fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: `https://${HOST}/${INDEXNOW_KEY}.txt`,
      urlList,
    }),
  })
    .then((r) => {
      // 200/202 are success. Anything else is worth a log line, nothing more.
      if (!r.ok && r.status !== 202) {
        console.warn(`[indexnow] ping returned ${r.status} for ${urlList.length} url(s)`);
      }
    })
    .catch((err) => console.warn("[indexnow] ping error:", (err as Error)?.message));
}
