/**
 * Mobile tap audit — a WebKit (real Safari engine) walkthrough that hit-tests
 * every interactive element on every page and reports the ones a user could
 * NOT actually tap.
 *
 * Why this exists
 * ---------------
 * On 2026-07-17 whole swaths of the site were untappable on iOS Safari — profile
 * tabs, the Received/Sent toggle, the admin FAB gesture — while looking perfectly
 * fine in a screenshot. A visual audit cannot catch this: the button IS painted,
 * it is just covered by something transparent, or sits under an element that eats
 * the tap. The only way to catch it mechanically is to do what a finger does —
 * ask "if I press the center of this button, what element actually receives it?"
 * (document.elementFromPoint) — and flag every case where the answer is not the
 * button. That is the check the previous audit lacked.
 *
 * Why WebKit specifically
 * -----------------------
 * These bugs are Safari-engine bugs (stacking contexts from transforms, iOS hit
 * testing, -webkit quirks). Chromium does not reproduce them. Playwright bundles
 * WebKit — the same engine Safari renders with — so this catches the large
 * majority of iOS Safari layout/hit-test issues on any OS, including Windows.
 *
 * The honest limit
 * ----------------
 * Playwright WebKit is the Safari *engine* with an iPhone viewport, user agent,
 * touch flags and DPR. It is NOT the iOS *system*: no real Mobile Safari chrome,
 * no exact iOS touch/gesture model, no per-iOS-version quirks. It catches
 * occlusion, stacking, pointer-events and sizing bugs — the bulk of what bit us.
 * It will not catch things that need the actual OS (e.g. iOS momentum-scroll
 * interactions, the URL bar collapse, real double-tap-zoom timing). For final
 * sign-off on a fix, still tap it on a real iPhone, or run this same script
 * against a real-device cloud (BrowserStack/Sauce) whose WebKit endpoint
 * Playwright can drive unchanged.
 *
 * Usage
 * -----
 *   node scripts/mobile-tap-audit.mjs                 # audit live public pages
 *   node scripts/mobile-tap-audit.mjs --base http://localhost:5173
 *   node scripts/mobile-tap-audit.mjs --paths /,/apply,/game
 *   node scripts/mobile-tap-audit.mjs --device "iPhone 15 Pro"
 *
 * Authenticated pages (profile, admin) need a signed-in context; pass a storage
 * state you captured once with `--storage auth.json` (see README note at bottom).
 * Exit code is non-zero if any untappable element is found, so CI can gate on it.
 *
 * Git Bash gotcha: a leading "/" in --paths is rewritten to a Windows path by
 * MSYS before Node sees it, so `--paths /,/game` silently skips the home page.
 * Prefix the command with `MSYS_NO_PATHCONV=1`, or run it from PowerShell/CI.
 */
import { webkit, devices } from "playwright";

const args = Object.fromEntries(
  process.argv.slice(2).join(" ").split("--").filter(Boolean).map((s) => {
    const [k, ...rest] = s.trim().split(/\s+/);
    return [k, rest.join(" ") || true];
  }),
);

const BASE = args.base || "https://regencivics.earth";
const DEVICE = args.device || "iPhone 13";
// Public routes by default. The bugs Rye hit were on authed pages, but if the
// cause is a shared component (a scroll-reveal wrapper, a decorative overlay),
// it shows up on public pages too — and those need no login to reproduce.
const PATHS = (typeof args.paths === "string" ? args.paths : "/,/apply,/game,/quests,/bounties,/community,/ship")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const INTERACTIVE = [
  "button",
  "a[href]",
  "input:not([type=hidden])",
  "select",
  "textarea",
  "[role=button]",
  "[role=tab]",
  "[role=switch]",
  "[role=link]",
  "[onclick]",
].join(",");

/**
 * The core hit test, run in the page. For each interactive element that is
 * on-screen and non-trivial in size, sample five points (center + four insets,
 * because a partial overlay may only cover, say, the top half) and ask what
 * elementFromPoint returns. If none of the samples land on the element (or a
 * descendant/ancestor of it), the element is effectively untappable, and we
 * record what is sitting on top instead.
 */
function collectUntappable(selector) {
  const desc = (el) => {
    if (!el) return "(nothing)";
    const id = el.id ? `#${el.id}` : "";
    const cls = typeof el.className === "string" && el.className
      ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
      : "";
    const z = getComputedStyle(el).zIndex;
    const txt = (el.textContent || "").trim().slice(0, 22);
    return `${el.tagName.toLowerCase()}${id}${cls}${z !== "auto" ? ` z:${z}` : ""}${txt ? ` "${txt}"` : ""}`;
  };

  // A large, high-z fixed/absolute overlay (a modal, a cookie banner, a drawer)
  // is a LEGITIMATE tap blocker: it is supposed to capture everything behind it
  // until dismissed. Flagging the page under an open modal is noise. So: find
  // the outermost such overlay above a given node; anything behind it is skipped,
  // while the overlay's OWN children (the modal's buttons) are still audited.
  const isBigOverlay = (node) => {
    if (!node || node === document.body || node === document.documentElement) return false;
    const cs = getComputedStyle(node);
    if (cs.position !== "fixed" && cs.position !== "absolute") return false;
    if ((parseInt(cs.zIndex, 10) || 0) < 40) return false;
    const r = node.getBoundingClientRect();
    return r.width >= innerWidth * 0.6 && r.height >= innerHeight * 0.6;
  };
  const overlayRootOf = (node) => {
    let root = null;
    for (let n = node; n && n !== document.body; n = n.parentElement) {
      if (isBigOverlay(n)) root = n;
    }
    return root;
  };

  const out = [];
  const els = Array.from(document.querySelectorAll(selector));
  for (const el of els) {
    const r = el.getBoundingClientRect();
    // Skip anything not currently laid out on screen — offscreen tabs, closed
    // menus, zero-size. We only judge what a user could be looking at.
    if (r.width < 8 || r.height < 8) continue;
    if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none" || cs.opacity === "0") continue;

    const cx = Math.min(Math.max(r.left + r.width / 2, 1), innerWidth - 1);
    const cy = Math.min(Math.max(r.top + r.height / 2, 1), innerHeight - 1);
    const pts = [
      [cx, cy],
      [r.left + r.width * 0.25, r.top + r.height * 0.5],
      [r.left + r.width * 0.75, r.top + r.height * 0.5],
      [r.left + r.width * 0.5, r.top + r.height * 0.25],
      [r.left + r.width * 0.5, r.top + r.height * 0.75],
    ];

    let hitsSelf = false;
    let occluder = null;
    for (const [x, y] of pts) {
      const hit = document.elementFromPoint(
        Math.min(Math.max(x, 1), innerWidth - 1),
        Math.min(Math.max(y, 1), innerHeight - 1),
      );
      if (hit && (hit === el || el.contains(hit) || hit.contains(el))) {
        hitsSelf = true;
        break;
      }
      if (hit && !occluder) occluder = hit;
    }

    if (!hitsSelf) {
      // Behind a legitimate open modal/overlay? Expected — skip it, unless the
      // element is itself inside that overlay (then a covered modal button is a
      // real finding worth surfacing).
      const occRoot = overlayRootOf(occluder);
      if (occRoot && !occRoot.contains(el)) continue;

      // Trust elementFromPoint: it already honours pointer-events, so whatever
      // it returned at the centre IS what receives the tap. We deliberately do
      // NOT walk ancestors for pointer-events:none — a child re-enabled with
      // pointer-events:auto inside a pointer-events:none wrapper is perfectly
      // tappable (that is exactly the fixed WizardRadialMenu), and flagging it
      // would cry wolf on the correct fix.
      out.push({
        target: desc(el),
        label: (el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 40),
        occludedBy: desc(occluder),
      });
    }
  }
  return out;
}

async function run() {
  const device = devices[DEVICE];
  if (!device) {
    console.error(`Unknown device "${DEVICE}". Try one of: iPhone 13, iPhone 14, iPhone 15 Pro.`);
    process.exit(2);
  }
  const browser = await webkit.launch();
  const context = await browser.newContext({
    ...device,
    ...(typeof args.storage === "string" ? { storageState: args.storage } : {}),
    serviceWorkers: "block", // else the SW reloads the page mid-audit
  });
  const page = await context.newPage();

  let totalBad = 0;
  for (const path of PATHS) {
    const url = BASE.replace(/\/$/, "") + path;
    try {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      // Let scroll-reveal wrappers settle and lazy chunks mount.
      await page.waitForTimeout(1500);
      // Dismiss the cookie-consent modal first. It is a legitimate full-screen
      // overlay (z:10000) that blocks the page until answered — auditing with it
      // up would flag every element behind it as "untappable". Choose the
      // privacy-preserving option. Best-effort; ignored if no banner is present.
      for (const label of ["Essential Only", "Reject All", "Decline", "Accept All Cookies", "Accept", "Got it"]) {
        const btn = page.getByRole("button", { name: label, exact: false }).first();
        if (await btn.count().catch(() => 0)) {
          await btn.click({ timeout: 1500 }).catch(() => {});
          break;
        }
      }
      await page.waitForTimeout(400);
      // Drive the page top-to-bottom so IntersectionObserver-gated content
      // reveals before we test it — a user scrolls, so must the audit.
      await page.evaluate(async () => {
        for (let y = 0; y <= document.body.scrollHeight; y += window.innerHeight) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 250));
        }
        window.scrollTo(0, 0);
      });
      await page.waitForTimeout(400);

      const bad = await page.evaluate(collectUntappable, INTERACTIVE);
      if (bad.length === 0) {
        console.log(`\n✓ ${path} — every interactive element is tappable`);
      } else {
        totalBad += bad.length;
        console.log(`\n✗ ${path} — ${bad.length} untappable element(s):`);
        for (const b of bad) {
          console.log(`   • ${b.target}  "${b.label}"`);
          console.log(`     covered by → ${b.occludedBy}`);
        }
      }
    } catch (err) {
      console.log(`\n! ${path} — could not audit: ${err.message}`);
    }
  }

  await browser.close();
  console.log(
    totalBad === 0
      ? `\n✓ ${DEVICE}: no untappable elements across ${PATHS.length} page(s).`
      : `\n✗ ${DEVICE}: ${totalBad} untappable element(s). These are the taps that do nothing on Safari.`,
  );
  process.exit(totalBad === 0 ? 0 : 1);
}

run().catch((e) => {
  console.error(e);
  process.exit(2);
});

/*
 * Capturing an authed storage state once (for profile/admin audits):
 *   node -e "const {webkit,devices}=require('playwright');(async()=>{const b=await webkit.launch({headless:false});const c=await b.newContext({...devices['iPhone 13']});const p=await c.newPage();await p.goto('https://regencivics.earth/login');console.log('Log in in the window, then press Enter here');process.stdin.once('data',async()=>{await c.storageState({path:'auth.json'});await b.close();process.exit(0)})})()"
 * Then:  node scripts/mobile-tap-audit.mjs --storage auth.json --paths /profile,/admin
 * Keep auth.json out of git (it holds a session cookie).
 */
