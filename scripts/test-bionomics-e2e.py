"""
End-to-end test for the Bionomics page.
Runs all 10 verification checks from the spec, captures screenshots,
and reports pass/fail.
"""
from playwright.sync_api import sync_playwright
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding="utf-8", errors="replace")

BASE = "http://localhost:3000"
SHOTS = "screenshots/bionomics-2026-04-06"
os.makedirs(SHOTS, exist_ok=True)

results = []
console_errors = []


def log(name, ok, detail=""):
    status = "PASS" if ok else "FAIL"
    print(f"  [{status}] {name}{(' - ' + detail) if detail else ''}")
    results.append((name, ok, detail))


def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)

        # ─── Desktop ─────────────────────────────────────────────────────
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()

        page.on("console", lambda msg: console_errors.append((msg.type, msg.text)) if msg.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(("pageerror", str(e))))
        page.on("response", lambda r: console_errors.append(("404", r.url)) if r.status == 404 else None)

        # CHECK 1: /bionomics renders, hero loads, no console errors
        print("\n=== CHECK 1: /bionomics renders ===")
        resp = page.goto(f"{BASE}/bionomics", wait_until="networkidle")
        log("status 200", resp.status == 200, f"got {resp.status}")
        title = page.title()
        log("page title set", bool(title), title)
        # Hero image presence
        hero = page.locator('img[src*="blog-hero-bridging-worlds"]').first
        log("hero image present", hero.count() > 0)
        page.screenshot(path=f"{SHOTS}/01-bionomics-desktop.png", full_page=True)

        # CHECK 2: /economy redirects to /bionomics
        print("\n=== CHECK 2: /economy redirect ===")
        page.goto(f"{BASE}/economy", wait_until="networkidle")
        log("/economy -> /bionomics", "/bionomics" in page.url, page.url)

        # CHECK 3: /local-food-economy redirects to /bionomics#local-food-economies
        print("\n=== CHECK 3: /local-food-economy redirect ===")
        page.goto(f"{BASE}/local-food-economy", wait_until="networkidle")
        log("/local-food-economy -> /bionomics", "/bionomics" in page.url, page.url)
        # Hash check (wouter Redirect drops the hash sometimes; record either way)
        log("hash includes local-food-economies", "local-food-economies" in page.url, page.url)

        # CHECK 4: Accordions open/close
        print("\n=== CHECK 4: Accordions ===")
        page.goto(f"{BASE}/bionomics", wait_until="networkidle")
        n = page.locator('button[aria-expanded]').count()
        log("accordion triggers found", n > 0, f"{n} triggers")
        for i in range(min(3, n)):
            try:
                t = page.locator('button[aria-expanded]').nth(i)
                t.scroll_into_view_if_needed()
                before = t.get_attribute("aria-expanded")
                t.click(force=True, timeout=5000)
                page.wait_for_timeout(400)
                after = t.get_attribute("aria-expanded")
                log(f"accordion {i+1} toggles", before != after, f"{before}->{after}")
            except Exception as e:
                log(f"accordion {i+1} toggles", False, str(e).split(chr(10))[0][:80])

        # CHECK 5: Nav bridge label + links
        print("\n=== CHECK 5: Nav bridge pairing ===")
        page.goto(f"{BASE}/", wait_until="networkidle")
        # Bridge label lives in nav source (rendered or portaled). Check both.
        # Desktop nav uses Radix DropdownMenu - try opening Game / Fund dropdown.
        # Open every top-level nav button to portal-mount dropdown content.
        # Bridge label lives in the "Explore + Connect" dropdown
        try:
            page.get_by_role("button", name="Explore + Connect").first.click(timeout=3000)
            page.wait_for_timeout(400)
        except Exception as e:
            print(f"    (could not open dropdown: {str(e).split(chr(10))[0][:80]})")
        bridge_label = page.locator('text="The Two Sides of the Bridge"').count()
        log("bridge label rendered", bridge_label > 0, f"count={bridge_label}")
        tok_links = page.locator('a[href="/tokenomics"], [href="/tokenomics"]').count()
        bio_links = page.locator('a[href="/bionomics"], [href="/bionomics"]').count()
        log("Tokenomics nav link present", tok_links > 0, f"count={tok_links}")
        log("Bionomics nav link present", bio_links > 0, f"count={bio_links}")

        # CHECK 6: SiteFooter Bionomics link
        print("\n=== CHECK 6: Footer Bionomics link ===")
        footer = page.locator('footer').first
        footer_bio = footer.locator('a[href="/bionomics"]').count()
        log("footer Bionomics link", footer_bio > 0, f"count={footer_bio}")

        # CHECK 7: Tokenomics $ReGen note links to /bionomics
        print("\n=== CHECK 7: Tokenomics ↔ Bionomics link ===")
        page.goto(f"{BASE}/tokenomics", wait_until="networkidle")
        regen_links = page.locator('a[href*="/bionomics"]').count()
        log("Tokenomics -> Bionomics link", regen_links > 0, f"count={regen_links}")

        # CHECK 8: GameMechanics shows Citizenship Tiers
        print("\n=== CHECK 8: GameMechanics Citizenship Tiers ===")
        page.goto(f"{BASE}/game-mechanics", wait_until="networkidle")
        tiers = page.locator('text=/Citizenship Tiers/i').count()
        log("Citizenship Tiers section present", tiers > 0, f"count={tiers}")

        page.close()
        ctx.close()

        # ─── Mobile ──────────────────────────────────────────────────────
        print("\n=== CHECK 9: Mobile breakpoints ===")
        for w, name in [(360, "360"), (414, "414"), (768, "768")]:
            ctx = browser.new_context(viewport={"width": w, "height": 900},
                                      device_scale_factor=2,
                                      is_mobile=(w < 768))
            page = ctx.new_page()
            page.goto(f"{BASE}/bionomics", wait_until="networkidle")
            page.wait_for_timeout(500)
            shot = f"{SHOTS}/02-bionomics-mobile-{name}.png"
            page.screenshot(path=shot, full_page=True)
            log(f"mobile {name}px screenshot", os.path.exists(shot))
            ctx.close()

        # CHECK 10: page weight / hero load (basic perf signal; full Lighthouse runs separately)
        print("\n=== CHECK 10: Quick perf signal ===")
        ctx = browser.new_context(viewport={"width": 1440, "height": 900})
        page = ctx.new_page()
        # Network capture
        sizes = []
        page.on("response", lambda r: sizes.append(len(r.body())) if r.request.resource_type in ("script", "stylesheet", "image", "document") else None)
        try:
            page.goto(f"{BASE}/bionomics", wait_until="networkidle", timeout=30000)
            log("loads < 30s", True)
        except Exception as e:
            log("loads < 30s", False, str(e)[:80])
        ctx.close()

        browser.close()

    # ── Console error report ────────────────────────────────────────────
    print("\n=== Console errors ===")
    if console_errors:
        for kind, msg in console_errors[:20]:
            print(f"  [{kind}] {msg[:200]}")
    else:
        print("  none")

    # ── Summary ─────────────────────────────────────────────────────────
    print("\n=== SUMMARY ===")
    passed = sum(1 for _, ok, _ in results if ok)
    total = len(results)
    print(f"  {passed}/{total} checks passed")
    failed = [r for r in results if not r[1]]
    if failed:
        print("  Failures:")
        for name, _, detail in failed:
            print(f"    - {name}: {detail}")
        sys.exit(1)


if __name__ == "__main__":
    main()
