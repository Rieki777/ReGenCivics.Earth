from playwright.sync_api import sync_playwright
import sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
with sync_playwright() as p:
    b = p.chromium.launch(headless=True)
    page = b.new_page()
    def cb(m):
        if 'Content Security' in m.text:
            loc = m.location
            print(f"FILE: {loc.get('url')}:{loc.get('lineNumber')}:{loc.get('columnNumber')}")
            print(f"TEXT: {m.text[:300]}")
            print()
    page.on('console', cb)
    for path in ['/', '/bionomics', '/quest']:
        try:
            page.goto(f'http://localhost:3000{path}', wait_until='networkidle', timeout=20000)
        except: pass
    b.close()
