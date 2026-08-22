# Mobile navigation on the Living Map — diagnosis, research, recommendation

**Date:** 2026-08-22
**Scope:** read-only research. No code was changed.
**Base read:** `origin/main` (`e1110bc`), via `git show origin/main:PATH`.
**Artifact:** `docs/prototypes/grounds-v0.html` (8109 lines, 5.6 MB), served at `/grounds/index.html`, framed by `client/src/pages/LivingMap.tsx`.

Every line reference below is to the file as it exists on `origin/main`. Measurements marked **MEASURED** come from a Playwright/CDP probe I ran against the artifact with trusted touch input; the probe scripts are in this scratchpad (`probe_touch3.cjs`, `probe_touch4.cjs`) and are described in §4.6.

---

## 0. The short version

The founder reports two things that feel like one bug but are two:

1. **The browser zooms the whole window instead of the map.** Cause: the map canvas declares no `touch-action`, so the browser is entitled to claim every pan and pinch that starts on it. The only thing holding it off is a `preventDefault()` inside a `touchmove` handler, which is the wrong lever and loses the race on iOS.
2. **The map is "incredibly unresponsive".** Cause: two independent drag implementations are bound to the same canvas and both run on every touch. A one-finger drag moves the camera **~2.4× further than the finger**, and a two-finger pinch centred exactly on the screen centre translates the map sideways by **+560 to +880 world pixels** when it should not move at all.

Item 2 is not an iOS problem. It reproduces in headless Chromium and it is arithmetic, not platform behaviour. It is also the part that makes the map feel broken *even when* the browser behaves. Fixing the `touch-action` alone will not fix it — **MEASURED**: forcing `touch-action: none` on the canvas changed the numbers by zero.

And one thing is genuinely unknown, so it is stated up front rather than buried: **the map lives in an iframe, and no source establishes whether a document inside an iframe can refuse a pinch on iOS at all.** `touch-action` is known *not* to cascade *into* a frame (that direction is normative), and a framed document cannot even observe that the page was zoomed. The reverse direction is untested in the literature. §3.2 opens with a twenty-minute device experiment that settles it, because the answer decides whether this is a three-line fix or a structural change.

---

# PART 1 — Diagnosis of the actual code

## 1.1 (a) The viewport meta tags

**Parent shell — `client/index.html:6`:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5, viewport-fit=cover" />
```

**Artifact — `docs/prototypes/grounds-v0.html:5`:**

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

Findings:

- **`user-scalable=no` appears nowhere in the repository.** Proved with `git grep -n "user-scalable\|maximum-scale" origin/main`, which returns exactly one hit: `client/index.html:6`. (Control: the same grep form finds `iframe` in four client files, so the pattern shape is sound.)
- The one scale directive present is `maximum-scale=5`, which *permits* page zoom up to 5×. Nothing in this codebase is trying to suppress page zoom via the viewport meta.
- **This is correct and should stay.** iOS Safari has ignored `user-scalable=no` and `maximum-scale` since iOS 10 for accessibility reasons (§2.2). Any proposed fix that reaches for those attributes is both an accessibility regression and a no-op on the founder's device. Rule it out now so nobody spends a day on it.
- **A viewport meta inside an iframe governs nothing.** The artifact's `:5` tag is inert in production: the frame's layout viewport is the size the parent gives the `<iframe>` element, and page zoom is a property of the top-level document. It matters only when the artifact is opened directly (which is how every QA probe in `docs/prototypes/qa/` opens it — see §4.6).

## 1.2 (b) How the map handles touch today

The map is a **camera over a 2D canvas**, not an SVG viewBox and not a CSS transform:

- `grounds-v0.html:1054` — `<canvas id="scene"></canvas>`
- `grounds-v0.html:1662` — `const cv=document.getElementById('scene'),cx=cv.getContext('2d');`
- `grounds-v0.html:2093` — `const cam={x:900,y:640,z:0.72,vx:0,vy:0};`
- `grounds-v0.html:2096` — `screenToWorld(px,py)` maps screen→world through `cam.z` and `DPR`
- `grounds-v0.html:2100` — `minZoom(){return Math.min(innerWidth/W,innerHeight/H)*0.85}` — the zoom floor is FIT × 0.85
- `grounds-v0.html:2124–2140` — `camBounds()` / `clampCam()`; `const OVERSCROLL=0.5` at `:2118`; zoom ceiling `3.2` at `:2138` (`clampCam`) and `:2142` (`travelTo`). The clamp is a **hard** clamp — no rubber-banding at bounds (§2.1)
- `grounds-v0.html:2193` — `function frame(ts)` — a full canvas repaint every rAF tick, with inertia at `:2194`: `if(!dragging&&!travel){cam.x+=cam.vx;cam.y+=cam.vy;cam.vx*=.9;cam.vy*=.9;clampCam()}`
- `grounds-v0.html:1743–1745` — `let DPR=Math.min(window.devicePixelRatio||1,2)` and `fit()` sizing the backing store; DPR is sensibly capped at 2

There are **four** separate input paths onto that camera, and on a phone **three of them fire at once**:

### Path A — Pointer Events (written for a mouse, fires for touch)

`grounds-v0.html:2146–2156`:

```js
cv.addEventListener('pointerdown',e=>{
  if(window.boundPointerDown&&window.boundPointerDown(e)){cv.setPointerCapture(e.pointerId);return}
  if(window.featPointerDown&&window.featPointerDown(e)){cv.setPointerCapture(e.pointerId);return}
  dragging=true;cv.classList.add('dragging');lastP=[e.clientX,e.clientY];cam.vx=cam.vy=0;
  if(travel){const d=travel.done;travel=null;d&&d()}
  cv.setPointerCapture(e.pointerId)});
addEventListener('pointermove',e=>{
  if(dragging&&lastP){const dx=(e.clientX-lastP[0])/cam.z,dy=(e.clientY-lastP[1])/cam.z;
    cam.x-=dx;cam.y-=dy;cam.vx=-dx;cam.vy=-dy;lastP=[e.clientX,e.clientY];clampCam()}
  else updateHover(e.clientX,e.clientY)});
addEventListener('pointerup',()=>{dragging=false;cv.classList.remove('dragging');lastP=null});
```

**There is no `pointerType` guard anywhere in the file.** Proved: `grep -n "pointerType" grounds-v0.html` returns nothing, against a control (`setPointerCapture`) that returns 5 hits. So on a phone this whole path runs on the same fingers that Path C is reading, and it uses a **single** `lastP` for **all** pointer ids — so during a two-finger gesture `lastP` alternates between two fingers 200 px apart and the camera is dragged by that difference. `pointermove` is bound to `window`, not `cv`, so `setPointerCapture` does not scope it.

### Path B — wheel / trackpad, and the Safari gesture events

`grounds-v0.html:2157–2168`:

```js
cv.addEventListener('wheel',e=>{e.preventDefault(); ... },{passive:false});
cv.addEventListener('dblclick',e=>{ ... travelTo(wx,wy,Math.max(cam.z,1.15))});
(function safariPinch(){let gz=1,gx=0,gy=0;
  cv.addEventListener('gesturestart',e=>{e.preventDefault();gz=cam.z;gx=e.clientX;gy=e.clientY});
  cv.addEventListener('gesturechange',e=>{e.preventDefault();
    const[wx,wy]=screenToWorld(gx,gy);cam.z=gz*e.scale;clampCam();
    const[nx,ny]=screenToWorld(gx,gy);cam.x+=wx-nx;cam.y+=wy-ny;clampCam()});
  cv.addEventListener('gestureend',e=>e.preventDefault())})();
```

This is the **only** correct gesture implementation in the file: `{passive:false}` on `wheel`, `preventDefault()` on all three WebKit gesture events, and — importantly — a proper **anchor-preserving zoom** (`screenToWorld` before, `screenToWorld` after, shift the camera by the difference). It is a desktop-trackpad and desktop-Safari path. Note the anchor is frozen at `gesturestart` (`gx,gy`) rather than tracking the live midpoint, which is a minor correctness gap but not the bug.

### Path C — the pocket touch handler

`grounds-v0.html:7853–7866` (this is the mobile implementation):

```js
/* gestures: one-finger pan, two-finger pinch, on the canvas */
(function touchNav(){const el=$('scene');if(!el)return;let T=null; // id is 'scene'; $('cv') was null and this block never ran
  el.addEventListener('touchstart',e=>{if(!document.body.classList.contains('pocket'))return;
    if(e.touches.length===1){const t=e.touches[0];T={m:'pan',x:t.clientX,y:t.clientY}}
    else if(e.touches.length===2){const[a,b]=e.touches;
      T={m:'pinch',d:Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY),z:cam.z}}},{passive:true});
  el.addEventListener('touchmove',e=>{if(!T)return;e.preventDefault();
    if(T.m==='pan'&&e.touches.length===1){const t=e.touches[0];
      cam.x-=(t.clientX-T.x)/cam.z;cam.y-=(t.clientY-T.y)/cam.z;T.x=t.clientX;T.y=t.clientY;
      travel=null;clampCam();window.WGATE&&(WGATE.pan=true)}
    if(T.m==='pinch'&&e.touches.length===2){const[a,b]=e.touches;
      const d=Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
      cam.z=Math.max(minZoom(),Math.min(2.6,T.z*d/T.d));clampCam();window.WGATE&&(WGATE.pinch=true)}},{passive:false});
  el.addEventListener('touchend',()=>{T=null},{passive:true})})();
```

Six defects in fourteen lines:

1. **It coexists with Path A.** Both pan the same camera from the same fingers. This is the "unresponsive" bug (§1.7).
2. **The pinch has no midpoint anchor.** `cam.z` is assigned and `clampCam()` is called; the camera is never shifted to keep the point between the fingers fixed. The map therefore zooms about the **screen centre**, so everything under the fingers slides away — the error grows with distance from centre and with `|scale − 1|`. Compare Path B at `:2165–2167`, which does the anchor correctly, and Leaflet/MapLibre/OpenLayers, all of which anchor at the live midpoint (§2.1).
3. **There is no two-finger pan.** Anchoring at the midpoint would give it for free (Leaflet's `delta` term, §2.1).
4. **The zoom ceiling disagrees with the rest of the file:** `2.6` here vs `3.2` in `clampCam()` (`:2138`) and in `travelTo()` (`:2142`). A pinch cannot reach the zoom a tapped building flies to.
5. **`touchend` does not handle finger-count transitions.** Lifting one finger of a pinch leaves `T.m==='pinch'` with one touch, so both branches fail their length test and the gesture dies silently until all fingers lift. There is no `touchcancel` listener at all (`grep -c touchcancel` = 0).
6. **No inertia.** Path A sets `cam.vx/vy` for the momentum in `frame()` at `:2194`; Path C never does. So mobile pan gets momentum only as a side effect of the bug in Path A — the coupling is accidental.

### Path D — dead code that reads as live

`grounds-v0.html:2517`, `4259`, `4282–4292`, `4552–4563`, `4687–4691` — build-mode / feature-drawing pointer handlers, gated on `buildMode`, `placing`, `drawMode`, `featDrag`. Not implicated for a signed-out visitor, but they share the same unguarded pointer stream and will misbehave on touch if build mode is ever opened on a phone.

## 1.3 (c) `touch-action` — the root cause

`grep -c "touch-action"` over the artifact returns **2**. Both are on other surfaces:

- `grounds-v0.html:451` — `.lgrip{cursor:grab;user-select:none;touch-action:none}` — the Loom's drag grips
- `grounds-v0.html:541` — `#orgSvg{flex:1;width:100%;cursor:grab;touch-action:none}` — the **circles** view

And the living map's own canvas, `grounds-v0.html:16`:

```css
#scene{position:absolute;inset:0;cursor:grab}
```

**No `touch-action`.** **MEASURED**: `getComputedStyle(document.getElementById('scene')).touchAction === "auto"` on a 390×844 `hasTouch` context with `body.pocket` applied.

This is the headline. Somebody already knew the rule — they applied `touch-action: none` to the org SVG and to the Loom grips — and the one surface that is the actual map was missed. `#orgSvg` is the *other* map view (`/map` → the ◎ toggle at `:7868`), so on the same page, on the same phone, the circles view correctly owns its gestures and the living map does not.

Consequences, per the CSS spec and MDN (§2.1): with `touch-action: auto` the browser intersects the value up the ancestor chain and concludes it may claim panning **and** pinch-zoom on this element. The page's only defence is the `preventDefault()` at `:7859` inside `touchmove`, and:

- It is a **race**. The browser decides whether to hand the gesture to the page or take it, and it decides early.
- **MEASURED, and this is the direct evidence**: in the isolation run where `body.pocket` was removed so nothing called `preventDefault()`, the event tally came back as `touchmove(1) [NOT-cancelable] × 8` — after the first move, Chromium marked the remaining `touchmove` events **non-cancelable**, i.e. it had already taken the gesture for itself and the page could no longer refuse. With `body.pocket` on, the first `touchmove` preventDefaults in time and the rest stay cancelable. The map is winning that race by a hair, on Chromium, on a fast machine.
- On iOS Safari, the pinch is not arbitrated through `touchmove` at all — see §2.2.

Client side: `git grep -n "touch-action\|touchAction" origin/main -- client server shared` returns exactly one hit, `client/src/index.css:685`:

```css
button, a, [role="button"], input, textarea, select, summary {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}
```

Correct and unrelated (it kills the 350 ms double-tap delay on controls). It does **not** match `<iframe>`, so the map frame inherits `auto`.

`overscroll-behavior` appears once in the client, `client/src/index.css:721`, scoped to `[data-scroll-contain]`, with a comment explicitly saying the document is left alone on purpose so pull-to-refresh keeps working. Once in the artifact, `grounds-v0.html:915`, on `.insp-lb-list`. Neither touches the map surface.

## 1.4 (d) The iframe seam

`client/src/pages/LivingMap.tsx`:

- **`:610`** — the shell: `<div className="fixed inset-0 z-50 h-[100dvh] w-screen overflow-hidden bg-background">`
- **`:686–694`** — the frame:
  ```jsx
  <iframe
    ref={frame}
    src={`${groundsUrl}${initialHash}`}
    onLoad={onLoad}
    title="Living map of the village"
    className="block h-full w-full border-0"
    allow="fullscreen"
  />
  ```
  **No `touch-action`, no inline style, no `scrolling` attribute.** The iframe element's computed `touch-action` is `auto`.
- **`:158–162`** — the parent body is locked while the map is open:
  ```js
  const prev = document.body.style.overflow;
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = prev; };
  ```
- The frame is **same-origin** (comment at `:692–693`: the shell reads `contentWindow`), so nothing is sandboxed away and the parent *can* reach in if it needs to.
- The map renders in **app mode**: `LivingMap` does not wrap in `<Layout>`, so no header and no `MobileTabBar`. (`Layout` is imported at `:41` and never used — dead import.) `/map` is not in `BARE_ROUTES` (`client/src/config/mobileNav.ts:74`), but that is moot because the bar is rendered by `Layout` at `client/src/components/Layout.tsx:646` and `Layout` never mounts here.
- The parent has **no gesture handling of any kind**: `git grep -n "gesturestart\|gesturechange\|touchmove\|touchstart\|pointerdown" origin/main -- client/src` returns one hit, `InfoTip.tsx:85`, an outside-click `pointerdown`. The parent is a passive host.

**Why the seam matters.** Three ways:

1. **Page zoom is a top-level-document property.** When iOS decides a pinch is a page zoom, it scales the *visual viewport* of the whole tab. The iframe's `innerWidth` does not change, so the artifact never fires `resize` (`:1745`), never re-runs `fit()`, and never re-renders. The map does not get blurry-then-sharp the way a native zoom of a canvas would — it gets scaled as a bitmap, cropped, and the HUD (`#vitals` at top, `#pbar` at bottom) slides off-screen. That is precisely the founder's "it zooms in the whole window".
2. **`touch-action` does not cross the frame boundary — in either direction.** This is normative and I had it backwards before checking: [w3c/pointerevents#325](https://github.com/w3c/pointerevents/issues/325), filed by a WebKit engineer who found that `<iframe style="touch-action:none">` *"did not prevent scrolling in this case and Chrome's behavior is similar"*, resolved by [PR#334](https://github.com/w3c/pointerevents/pull/334) (merged 2020) adding the note: ***"`touch-action` does not apply/cascade through to embedded browsing contexts."*** Mozilla concurred: *"The contents of iframe is a separate browsing context after all, why would iframe affect to the behavior there."* So putting `touch-action` on the `<iframe>` element does **not** govern touches on the canvas inside it. The corollary — whether the *inner* document's `touch-action` can suppress the *outer* page's pinch-zoom — is the open question (§2.2, A5) and it decides the architecture (§3.2).
3. **The child is blind to the zoom.** [MDN Viewport concepts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts): *"Only the top-level window has a visual viewport that may be distinct from the layout viewport. For included documents, the visual viewport and layout viewport are the same."* Confirmed by [csswg-drafts#8434](https://github.com/w3c/csswg-drafts/issues/8434) and a WPT manual test: `visualViewport.scale` reads `1` inside an iframe **even while the top page is pinch-zoomed**. So the artifact cannot detect that this happened, cannot correct for it, and cannot even log it. Any zoom canary must live in the parent.
4. **This is exactly why Google Maps ships `gestureHandling: "auto"` that resolves to `cooperative` when the map is in an iframe** (§2.1). The reference implementation treats "I am in a frame" as a distinct, harder case. This codebase treats it as the default case and has not accounted for it.

**Service worker:** `client/public/sw.js` intercepts only `^/grounds/grounds-[a-z0-9]+\.html$` and passes everything else through. It is not implicated. Ruled out.

**CSP:** `server/index.ts:5028–5035` sets `frame-ancestors 'self'` for the artifact. Not implicated.

## 1.5 (e) Existing mobile-specific map code

The map **does** know it is on a phone. `grounds-v0.html:7837–7840`:

```js
window.HUD_PROFILE=(()=>{if(/hud=pocket/.test(location.hash))return'pocket';if(/hud=desk/.test(location.hash))return'desk';
  return(('ontouchstart'in window)&&Math.min(innerWidth,innerHeight)<820)?'pocket':'desk'})();
if(HUD_PROFILE==='pocket')document.body.classList.add('pocket');
```

- Detection is `ontouchstart` **and** short side < 820 px. **MEASURED**: resolves to `pocket` in a 390×844 `hasTouch` context. It is `ontouchstart`-based, i.e. it keys on the device having touch, which is the trustworthy signal (the same reason the QA harness uses `hasTouch` alone — §4.6). A `?hud=pocket` / `?hud=desk` hash override exists and is useful for testing.
- `body.pocket` drives ~54 CSS rules and a mobile chrome: `#pbar` bottom bar at `:773` (`height:60px;z-index:60`), `#vitals` full-width top strip at `:769`, desktop furniture hidden wholesale at `:767`, `#panel` becomes a bottom sheet at `:797`.
- Haptics: `hap()` at `:7852`, latched behind a first-gesture `HAPTIC_OK` flag at `:7848–7850`.
- All the overlay layers above the canvas are `pointer-events:none` (`#icons` `:45`, `#badges` `:21`, `#banners` `:18`, `#vignette` `:873`), so `#scene` really is the hit target. **MEASURED**: `document.elementFromPoint(195,420)` returns the `#scene` canvas.

So the phone-awareness exists and is sound. What is missing is that the pocket profile never sets `touch-action` and never disables the desktop pointer path.

## 1.6 (f) Is there a gesture tutorial? No.

There is a **Welcome Walk**, and it is founder-authored, camera-driven, and content-shaped — confirmed as *not* a gesture tutorial.

`grounds-v0.html:7999–8019` — `window.WALK_SEED`. Each stop carries two fields that look like a gesture tutorial:

```js
{id:'w1',structure_key:'gate',title:'Welcome to Amora',gesture:'pan', ... gate_hint:'drag the land to look around'},
{id:'w3',structure_key:'ponds',title:'The Ponds',gesture:'pinch', ... gate_hint:'pinch to zoom the world'},
```

**Both fields are dead data.** Proved two ways:

- `grep -n "\.gesture\|gate_hint\|gateHint" grounds-v0.html` matches only inside `WALK_SEED` itself (`:8000–8018`). Nothing reads either field.
- `WGATE` — the object that was meant to record "the newcomer has now panned / pinched" — is **write-only**. Every occurrence is an assignment: `:2870` (`badge`), `:7862` (`pan`), `:7865` (`pinch`), `:7869` (`toggle`), `:8073` (`tap`), and the initialiser `:8020`. There is no read anywhere in 8109 lines.

The comment at `:8065–8071` explains why: the `#walkCard` renderer that used to show `gate_hint` was removed when the walk moved into the Maia dock, and the seed was left intact because other things read `body`. So the strings "drag the land to look around" and "pinch to zoom the world" exist in the file, are exactly the right words, and **have never been displayed to anyone**. The CSS for them is still there too (`#walkCard .wgate` at `:814`).

There is a silver lining: because `WGATE` is never read, a broken pinch does **not** block the walk. Had the gate been wired as designed, w3 would have trapped every iOS newcomer on "pinch to zoom the world" forever. If anyone re-wires `WGATE`, they must fix the gestures first.

Boot behaviour, `grounds-v0.html:8093–8096`:

```js
if(document.body.classList.contains('pocket')){
  setTimeout(()=>{leaveIntro();
    if(!location.hash||location.hash.length<3||/hud=/.test(location.hash)){
      if(!localStorage.getItem('amora-walk-done'))startWalk(false);
      else{cam.x=1100;cam.y=650;cam.z=.9;clampCam()}}},700)}
```

So on a phone, 700 ms after load, a first-time visitor is dropped straight into an auto-flying camera tour. Once-only, keyed on `localStorage['amora-walk-done']` (`:8027`, set at `:8059`). This is a good hook to hang a gesture coach mark on (§3.4) — the gate is already built and already counts runs (`sendWalkLog` → `POST /api/map/walk-log` at `:8043`).

For completeness: `/first-walk` (`client/src/pages/FirstWalk.tsx`) is a **founder's reading checklist** of modules to look at, unrelated to map gestures.

## 1.7 The measurements — what is actually broken, in numbers

Harness: Playwright 390×844, `hasTouch: true`, `deviceScaleFactor: 3`, **no `isMobile`** (house rule, §4.6), artifact loaded with `#hud=pocket`, Welcome Walk pre-dismissed via `localStorage`, camera reset to `{x:900, y:640, z:1.0}` before each run. Touch input dispatched over CDP `Input.dispatchTouchEvent`, which produces **trusted** events and therefore also exercises the browser's own gesture arbitration — unlike the shipped test (§4.6). Hit-test confirmed on `#scene`.

### Test A — one-finger drag, 100 CSS px left, at `cam.z = 1.0`

Correct answer: `cam.x` 900 → 1000, plus a short inertia tail.

| Run | Events reaching the page | `cam.x` after | Error |
|---|---|---|---|
| **A** as shipped | `pointerdown`×1, `touchstart(1)`×1, **`pointermove`×10 AND `touchmove(1)`×9** | **1134–1147** | **+2.4× too far** |
| **E** `body.pocket` removed (Path A alone) | `pointermove`×10, `touchmove(1)` × 9 but **8 marked NOT-cancelable** | 1046.9 | ≈ correct (100 + 47 inertia tail) |
| **C** `touch-action:none` forced on `#scene` | identical to A | **1146.9** | **unchanged — no improvement** |

Both handlers run. Path C moves the camera by the finger delta (90 px over 9 moves); Path A moves it by the same delta again (100 px over 10 moves) *and* loads `cam.vx` for the inertia in `frame()`, which adds the rest. The map travels roughly two and a half times as far as your finger and keeps sliding after you lift it. From the user's chair this is not "a bit fast" — it is a map that shoots out from under the finger and cannot be aimed.

### Test B — two-finger pinch, 200 px → 100 px, centred exactly on the screen centre (x = 195 of 390)

Correct answer: `cam.z` 1.0 → 0.5, `cam.x` **unchanged** (a symmetric pinch about the centre translates nothing).

| Run | `cam.z` after | `cam.x` after | Sideways drift |
|---|---|---|---|
| **B** as shipped | 0.5 ✓ | 1658–1778 | **+758 to +878 world px** |
| **F** `body.pocket` removed (Path A alone, no pinch code) | 1.0 (no zoom) | 1459.5 | **+559 world px** |
| **D** `touch-action:none` forced | 0.5 ✓ | 1777.7 | **+878 — unchanged** |

Run F is the smoking gun: with the *entire pinch implementation disabled*, a two-finger gesture still drags the camera 559 world pixels sideways. That is Path A's single `lastP` alternating between two fingers 200 px apart. The zoom ratio itself is computed correctly — `T.z*d/T.d` lands on 0.5 exactly — but the map lunges across the screen while it happens, so the correct zoom is invisible under the incorrect translation.

### What the measurements settle

- **The double-handling is real, is the dominant defect, and is platform-independent.** It reproduces in headless Chromium with no iOS involved.
- **`touch-action: none` alone fixes none of it** (runs C and D). It is necessary for the browser-zoom half and useless for the responsiveness half. Anyone who ships only the CSS one-liner will report success and the founder will report the map is still unusable.
- **The browser's gesture arbitration is live on this surface right now** (run E's non-cancelable `touchmove`s). The map holds it off only by winning a race inside `touchmove`.

### What the measurements do *not* settle

Chromium is not WebKit. This probe **cannot** reproduce the founder's "it zooms the whole window", because headless Chromium does not do iOS's pinch-to-zoom-the-page. The attribution of that half of the bug to `touch-action: auto` + the iframe seam rests on §2.2's sources and on `:16` being demonstrably `auto`, not on a measurement. Treat it as a strong, well-sourced inference; the real-device test in §4 is what will confirm it.

---

# PART 2 — Best in class

*(§2.1 below is a survey of primary sources: MDN, and the actual shipped source of Leaflet 1.9.4, MapLibre GL JS, OpenLayers, Phaser 3 and PixiJS.)*

## 2.1 The standard solution shape

**The CSS is the load-bearing part, not `preventDefault()`.** `touch-action` declares what the *browser* may still claim; you subtract what your app takes.

- `touch-action: none` — "Disable browser handling of all panning and zooming gestures." Other values: `auto`, `pan-x`, `pan-y`, `pan-left/right/up/down`, `pinch-zoom`, and `manipulation` (= `pan-x pan-y pinch-zoom`). — [MDN `touch-action`](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action)
- Two rules people trip on, quoted from MDN:
  - *"When a gesture starts, the browser intersects the `touch-action` values of the touched element and its ancestors, up to the one that implements the gesture (in other words, the first containing scrolling element)."* → setting it on the interactive surface is normally enough; you don't need it on descendants. **But the chain walks out of an iframe.**
  - *"After a gesture starts, changes to `touch-action` will not have any impact on the behavior of the current gesture."* → toggling it inside `pointerdown` is too late. It must be in the stylesheet, or set before the gesture begins.
- MDN carries an explicit accessibility warning on this property: *"A declaration of `touch-action: none;` may inhibit operating a browser's zooming capabilities. This will prevent people experiencing low vision conditions from being able to read and understand page content."* This is why every major map ships a cooperative mode.

**Pointer Events + a two-entry cache** is the canonical implementation — [MDN: Pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures):

```js
const evCache = [];
let prevDiff = -1;
// pointerdown → evCache.push(ev)
// pointermove → replace by pointerId, then:
if (evCache.length === 2) {
  const curDiff = Math.hypot(evCache[0].clientX - evCache[1].clientX,
                             evCache[0].clientY - evCache[1].clientY);
  if (prevDiff > 0) { /* curDiff > prevDiff → zoom in, else out */ }
  prevDiff = curDiff;
}
// pointerup / pointercancel / pointerout / pointerleave → splice by pointerId
```

Note it binds `pointercancel`, `pointerout` and `pointerleave` to the **same** handler as `pointerup`. Handling `pointercancel` is not optional — MDN: *"A browser fires this event if it concludes the pointer will no longer be able to generate events"*, which is exactly what happens when the browser steals the gesture. The artifact has **zero** `pointercancel` and **zero** `touchcancel` listeners.

**`setPointerCapture(pointerId)`** — *"Subsequent events for the pointer will be targeted at the capture element until capture is released."* ([MDN](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture)) It is what makes a drag survive the finger leaving the element, and it is the correct answer to "I bound `pointermove` to `window` so I don't lose the drag" — which is what `grounds-v0.html:2152` does.

**Zoom about the midpoint.** With `screen = (world − offset) · k`, keeping the world point under midpoint `m` fixed as `k → k′`:

```
offset′ = m − (m − offset) · (k / k′)
```

MapLibre exposes exactly this as a primitive: `Transform.setLocationAtPoint(lnglat, point)` — *"Set's the transform's center so that the given point on screen is at the given world coordinates."*

### What the reference implementations actually set

**Leaflet 1.9.4 — per-handler `touch-action`, not blanket `none`.** [`dist/leaflet.css`](https://raw.githubusercontent.com/Leaflet/Leaflet/v1.9.4/dist/leaflet.css):

```css
.leaflet-container.leaflet-touch-zoom { touch-action: pan-x pan-y; }
.leaflet-container.leaflet-touch-drag { touch-action: none; touch-action: pinch-zoom; }
.leaflet-container.leaflet-touch-drag.leaflet-touch-zoom { touch-action: none; }
.leaflet-container { -webkit-tap-highlight-color: transparent; }
```

The classes are toggled by the handlers themselves (`Map.TouchZoom.addHooks` adds `leaflet-touch-zoom`; `Map.Drag.addHooks` adds `leaflet-grab leaflet-touch-drag`). Pinch-only → the browser keeps one-finger scroll; drag-only → the browser keeps pinch-zoom; both → `none`. **This is the most transferable idea in the survey**: you subtract precisely what you take, and no more.

Leaflet opts out of passive globally in `DomEvent.addOne`: `obj.addEventListener(type, handler, Browser.passiveEvents ? {passive: false} : false);`

`Map.TouchZoom._onTouchMove`, the whole pinch:

```js
if (!e.touches || e.touches.length !== 2 || !this._zooming) { return; }
var p1 = map.mouseEventToContainerPoint(e.touches[0]),
    p2 = map.mouseEventToContainerPoint(e.touches[1]),
    scale = p1.distanceTo(p2) / this._startDist;
this._zoom = map.getScaleZoom(scale, this._startZoom);
if (!map.options.bounceAtZoomLimits && (
    (this._zoom < map.getMinZoom() && scale < 1) ||
    (this._zoom > map.getMaxZoom() && scale > 1))) {
  this._zoom = map._limitZoom(this._zoom);
}
if (map.options.touchZoom === 'center') { this._center = this._startLatLng; if (scale === 1) return; }
else {
  var delta = p1._add(p2)._divideBy(2)._subtract(this._centerPoint);
  if (scale === 1 && delta.x === 0 && delta.y === 0) return;
  this._center = map.unproject(map.project(this._pinchStartLatLng, this._zoom).subtract(delta), this._zoom);
}
Util.cancelAnimFrame(this._animRequest);
this._animRequest = Util.requestAnimFrame(moveFn, this, true);
DomEvent.preventDefault(e);
```

Three things to steal: the midpoint anchor captured at `touchstart`; the `delta` term that gives **two-finger pan for free**; and `cancelAnimFrame`-then-`requestAnimFrame`, so N `touchmove`s in one frame produce exactly one camera update.

Also `bounceAtZoomLimits` (default `true`): *"Set it to false if you don't want the map to zoom beyond min/max zoom and then bounce back when pinch-zooming"* — note the guard is **directional**, so you can always pinch back out of an over-zoom without fighting the clamp. And `tapTolerance: 15` — *"The max number of pixels a user can shift his finger during touch for it to be considered a valid tap."*

**MapLibre GL JS / Mapbox GL JS — same per-handler trick, plus a cooperative mode.** [`src/css/maplibre-gl.css`](https://raw.githubusercontent.com/maplibre/maplibre-gl-js/main/src/css/maplibre-gl.css):

```css
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate,
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate .maplibregl-canvas { touch-action: pan-x pan-y; }
.maplibregl-canvas-container.maplibregl-touch-drag-pan,
.maplibregl-canvas-container.maplibregl-touch-drag-pan .maplibregl-canvas { touch-action: pinch-zoom; }
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan,
.maplibregl-canvas-container.maplibregl-touch-zoom-rotate.maplibregl-touch-drag-pan .maplibregl-canvas { touch-action: none; }
/* cooperative mode deliberately gives one-finger scroll back to the browser */
.maplibregl-canvas-container.maplibregl-touch-drag-pan.maplibregl-cooperative-gestures,
.maplibregl-canvas-container.maplibregl-touch-drag-pan.maplibregl-cooperative-gestures .maplibregl-canvas { touch-action: pan-x pan-y; }
```

Listener registration in `handler_manager.ts` — all on `map.getCanvasContainer()`, never on `window`:

```ts
[el, 'touchstart', {passive: true}],
[el, 'touchmove',  {passive: false}],
[el, 'touchend',   undefined],
[el, 'touchcancel',undefined],
[el, 'wheel',      {passive: false}],
```

Pinch math in `two_fingers_touch.ts`: `getZoomDelta = Math.log(distance / lastDistance) / Math.LN2` (ratio → zoom levels), `const pinchAround = this._aroundCenter ? null : a.add(b).div(2)` (the midpoint), `ZOOM_THRESHOLD = 0.1` zoom levels before a pinch counts, and rotation thresholded as `ROTATION_THRESHOLD / circumference * 360` so rotation gets *less* sensitive as the fingers close.

`cooperativeGestures` ([MapLibre `MapOptions`](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/)): *"If `true`… the map is only accessible on desktop while holding Command/Ctrl and only accessible on mobile with two fingers. Interacting with the map using normal gestures will trigger an informational screen."*

**OpenLayers — hybrid: CSS keeps page-scroll, `preventDefault()` reclaims it.** [`src/ol/ol.css`](https://raw.githubusercontent.com/openlayers/openlayers/main/src/ol/ol.css): `.ol-viewport { touch-action: pan-x pan-y; }` — OL takes *pinch* via CSS and reclaims one-finger pan dynamically in `MapBrowserEventHandler.js` with a `{passive: false}` `touchmove` and a guarded `event.preventDefault()`. `PinchZoom.js` anchors on `centroidFromPointers(this.targetPointers)`. Known footgun: adding `tabindex` to the map container has caused the viewport to compute `touch-action: auto` and kill gestures ([openlayers#10288](https://github.com/openlayers/openlayers/issues/10288)).

**Google Maps JS API — `gestureHandling`** ([reference](https://developers.google.com/maps/documentation/javascript/reference/map)):

- `"cooperative"`: *"Scroll events and one-finger touch gestures scroll the page, and do not zoom or pan the map. Two-finger touch gestures pan and zoom the map."*
- `"greedy"`: *"All touch gestures and scroll events pan or zoom the map."*
- `"none"`: *"The map cannot be panned or zoomed by user gestures."*
- `"auto"` (default): *"Gesture handling is either cooperative or greedy, depending on whether the page is scrollable **or in an iframe**."*

That last clause is the industry's verdict on this exact situation, and it is worth reading twice given §1.4.

**Phaser 3:** `Phaser.Display.Canvas.TouchAction(canvas, value)` — *"Sets the touch-action property on the canvas style. Can be used to disable default browser touch actions"* — default `'none'`. `TouchManager.js` uses `{passive:false}` when `inputTouchCapture` is on (default `true`) and guards every `preventDefault()` on `event.cancelable`. Note `input.activePointers` defaults to **1** — you must raise it to ≥2 or a second finger never arrives.

**PixiJS:** `EventSystem._addEvents()` sets `style.touchAction = 'none'` imperatively on the target element and unsets it in `_removeEvents()`. Notably it binds `wheel` as `{passive: true, capture: true}` — Pixi does not fight the browser for scroll.

### Momentum, rubber-banding, and why the midpoint matters

**Leaflet inertia** (`Map.Drag.js`): velocity is sampled over a **window** of recent positions/times, not the last two events — that is what stops one jittery final sample from flinging the map:

```js
speedVector = direction.multiplyBy(easeLinearity / duration),   // easeLinearity default 0.2
decelerationDuration = limitedSpeed / (inertiaDeceleration * ease),  // inertiaDeceleration default 3000 px/s²
offset = limitedSpeedVector.multiplyBy(-decelerationDuration / 2).round();
```

**MapLibre inertia** (`handler_inertia.ts`): `base { linearity: 0.3, easing: bezier(0,0,0.3,1) }`, `pan { deceleration: 2500, maxSpeed: 1400 }`, `zoom { deceleration: 20 }`. Zoom inertia is deliberately near-instant while pan inertia is long; `extendDuration()` then makes every axis land on the same frame so a fling that also had a little zoom doesn't decelerate in two visible stages.

**Rubber-banding at pan bounds** is one line in Leaflet — `maxBoundsViscosity` (default `0.0`, `1.0` = solid wall):

```js
_viscousLimit(value, threshold) { return value - (value - threshold) * this._viscosity; }
```

**Why the midpoint, not the element centre.** A pinch is direct manipulation: the user's model is that the two pixels under their fingertips stay under their fingertips. Zoom about the element centre and every pixel except the exact centre slides — error grows linearly with distance from centre and with `|scale − 1|`, so it is worst exactly when someone pinches hard near a corner. All three engines anchor at the midpoint by default and make centre-anchoring the explicit opt-out (Leaflet `touchZoom: 'center'`, MapLibre `_aroundCenter`, OL `centroidFromPointers`). The second reason: a live midpoint anchor makes two-finger pan fall out of the same equation for free.

### Performance — what makes it feel fast

- **rAF-batch the moves. Biggest single win.** Touch hardware reports at 120–240 Hz; you can paint at 60–120. Leaflet: `cancelAnimFrame` then `requestAnimFrame`. MapLibre: push into a `_changes` array, apply once per frame. [web.dev: Debounce your input handlers](https://web.dev/articles/debounce-your-input-handlers) — input handlers are scheduled *before* rAF callbacks, and *"the compositor thread must wait for input handlers to complete (in case you call `preventDefault()`)"*, so a heavy `touchmove` handler literally blocks the frame.
- **Transform, never layout.** [web.dev animations guide](https://web.dev/articles/animations-guide): *"Restrict animations to `opacity` and `transform`."* Their measured example: `top`/`left` cost *"37ms for rendering and 79ms for painting"* vs zero for `transform`.
- **`will-change` is a last resort.** MDN: *"Excessive use of `will-change` will result in excessive memory use and will cause more complex rendering… it is a good practice to switch `will-change` on and off using script code before and after the change occurs."*
- **devicePixelRatio is a quadratic cost.** dpr 3 = 9× the fragments of dpr 1. Standard mitigation: render at a capped ratio during an active gesture and restore on release. MDN note worth knowing: *"Page zooming affects `devicePixelRatio`… but pinch-zooming does not"* — so dpr will not tell you a browser pinch happened.
- **`getCoalescedEvents()`** — MDN: user agents coalesce `pointermove` for performance at a cost in granularity. For a map you want the *last* sample per frame, not all of them; the full list is what you want for a **velocity estimate** for inertia, since it carries real sub-frame timing.

Sources for §2.1: [MDN touch-action](https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action) · [MDN Pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures) · [MDN Pointer events](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events) · [MDN setPointerCapture](https://developer.mozilla.org/en-US/docs/Web/API/Element/setPointerCapture) · [MDN addEventListener](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener) · [Chrome: scrolling intervention](https://developer.chrome.com/blog/scrolling-intervention) · [Chrome: passive event listeners](https://developer.chrome.com/blog/passive-event-listeners) · [Leaflet reference](https://leafletjs.com/reference.html) · [Leaflet v1.9.4 source](https://github.com/Leaflet/Leaflet/tree/v1.9.4) · [MapLibre GL JS source](https://github.com/maplibre/maplibre-gl-js) · [MapLibre MapOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/MapOptions/) · [Mapbox GL JS Map](https://docs.mapbox.com/mapbox-gl-js/api/map/) · [OpenLayers source](https://github.com/openlayers/openlayers) · [Google Maps JS Map reference](https://developers.google.com/maps/documentation/javascript/reference/map) · [Google Maps interaction options](https://developers.google.com/maps/documentation/javascript/interaction) · [Phaser TouchAction](https://github.com/phaserjs/phaser/blob/master/src/display/canvas/TouchAction.js) · [PixiJS EventSystem](https://github.com/pixijs/pixijs/blob/dev/src/events/EventSystem.ts) · [web.dev debounce input handlers](https://web.dev/articles/debounce-your-input-handlers) · [web.dev animations guide](https://web.dev/articles/animations-guide) · [MDN will-change](https://developer.mozilla.org/en-US/docs/Web/CSS/will-change) · [MDN devicePixelRatio](https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio) · [MDN getCoalescedEvents](https://developer.mozilla.org/en-US/docs/Web/API/PointerEvent/getCoalescedEvents)

### The passive-listener trap, stated precisely

MDN, [`addEventListener`](https://developer.mozilla.org/en-US/docs/Web/API/EventTarget/addEventListener), verbatim:

> If this option is not specified it defaults to `false` – except that in browsers other than Safari, it defaults to `true` for `wheel`, `mousewheel`, `touchstart` and `touchmove` events.

> A boolean value that, if `true`, indicates that the function specified by `listener` will never call `preventDefault()`. If a passive listener calls `preventDefault()`, nothing will happen and a console warning may be generated.

The Chrome intervention landed in **Chrome 56**: *"if the target of a `touchstart` or `touchmove` listener is the `window`, `document` or `body` we default `passive` to `true`."* Console message: *"Unable to preventDefault inside passive event listener due to target being treated as passive."*

Three consequences for this codebase:

1. **Scope.** The default applies only to `window`, `document`, `document.body`. The artifact's `touchmove` is on `#scene` (`:7859`), so `{passive:false}` there is honoured — that part is right. But `pointermove` at `:2152` **is** on `window`. Pointer events are not in the passive-by-default list so it still works, yet it is the exact shape that breaks silently if anyone converts it to `touchmove`.
2. **Safari is the exception** and does not default to passive — so a passive-listener bug can be Chrome/Firefox-only, and conversely a Safari-only bug (which is what we have) is *not* a passive-listener bug.
3. Chrome's own guidance in that post is to reach for **`touch-action` CSS rather than `preventDefault()`**. Which is precisely what `grounds-v0.html:16` omits.

## 2.2 iOS Safari specifics

### A1 — `user-scalable=no` / `maximum-scale` are ignored, and have been since iOS 10

Primary source, WebKit's own blog, [New Interaction Behaviors in iOS 10](https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/) (Dean Jackson, Feb 2017):

> "Prior to iOS 10, Safari allowed the content to block the user from zooming on a page by setting `user-scalable=no` in the viewport, or appropriate `min-scale` and `max-scale` values… Now, we ignore the `user-scalable`, `min-scale` and `max-scale` settings."

Stated rationale is accessibility: the old behaviour "enabled pages to pick a text size that was unreadable while giving the user no way to zoom."

What still works:
- **`WKWebView` only.** The same post introduces `WKWebViewConfiguration.ignoresViewportScaleLimits`, default `false` — a native app embedding a web view *can* still honour the limits. Safari and `SFSafariViewController` set it to `true`. Worth knowing given the founder may be in an in-app browser: **a native wrapper could still be honouring scale limits where Safari does not**, which would make behaviour differ between "opened in Safari" and "opened from a link inside another app". Worth one line in the device test (§3.6).
- `maximum-scale=1` still suppresses the auto-zoom when focusing an input under 16px. This codebase solves that the better way already, with a 16px floor in `client/src/index.css` (the block at `:726`), and correctly keeps `maximum-scale=5`.

Two traps:
- **Apple's archived [Configuring the Viewport](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/UsingtheViewport/UsingtheViewport.html) guide still documents `user-scalable=no` as working.** It predates iOS 10 and was never updated. The WebKit blog is the authority.
- **This is iOS-only.** Per [ppk's cross-browser survey](https://www.quirksmode.org/blog/archives/2020/12/userscalableno.html), Android Chrome, Edge, Firefox and UC Browser **still honour** `user-scalable=no`. So shipping it would not fix the founder's iPhone *and* would break zoom for most Android visitors. It is the worst of both worlds.

### A2 — the WebKit gesture events

`gesturestart` / `gesturechange` / `gestureend` are WebKit-proprietary ([MDN GestureEvent](https://developer.mozilla.org/en-US/docs/Web/API/GestureEvent) carries a "not recommended for production" banner). Per [Apple's Handling Events guide](https://developer.apple.com/library/archive/documentation/AppleApplications/Reference/SafariWebContent/HandlingEvents/HandlingEvents.html): `event.scale` starts at `1.0` and is an **absolute** multiple of the initial finger distance (not a delta); `event.rotation` is degrees clockwise from `0.0`.

- **They still fire.** [MDN browser-compat-data](https://github.com/mdn/browser-compat-data/blob/main/api/GestureEvent.json) lists `GestureEvent`, `scale` and `rotation` as Safari iOS 2+ / macOS 9+ with no removal version. No other engine implements them.
- **`preventDefault()` does suppress page zoom.** Apple: *"To disable pinch open and pinch close gestures in iOS, implement the `gesturestart` and `gesturechange` event handlers"* and call `preventDefault()`. Apple's own caveat: *"The default browser behavior may change in future releases."*
- **`{passive:false}` is mandatory**, or the `preventDefault()` silently no-ops.
- **They did not cross the shadow DOM boundary until iOS 12.2 / macOS 10.14.4** — [WebKit bug 195052](https://bugs.webkit.org/show_bug.cgi?id=195052). Not relevant here (no shadow DOM in the artifact), but it is evidence that their dispatch path has boundary quirks, which is the same class of question as the iframe boundary.
- **macOS dispatches them standalone**, with no accompanying pointer or touch event — which is why pointer-only libraries miss them and the page zooms ([OpenLayers#12989](https://github.com/openlayers/openlayers/issues/12989)). The artifact's `safariPinch` block at `:2163` handles this correctly for desktop Safari.
- **Safari 15+ also emits `wheel` with `ctrlKey`** for pinch, matching Chrome and Firefox — [WebKit bug 225788](https://bugs.webkit.org/show_bug.cgi?id=225788) (fixed May 2021). The artifact's `wheel` handler at `:2157` already reads `e.ctrlKey`, so it is already on that path.
- **iPadOS + Magic Trackpad is an unresolved hole**: [Apple forum 684087](https://developer.apple.com/forums/thread/684087) reports trackpad pinch on iPad generating no touch or pointer events at all and zooming the page regardless.
- **Whether `touch-action` gates gesture-event dispatch is undocumented.** No authoritative source found. Treat as unknown; do not design around either answer.

### A3 — does `touch-action` stop iOS page pinch-zoom?

**Yes, since Safari 13 — and the widely-cited advice saying otherwise is stale.**

| | `manipulation` | `none` / `pan-x` / `pan-y` / `pinch-zoom` | `pan-up/down/left/right` |
|---|---|---|---|
| Safari iOS | 9.3+ | **13+** | never |
| Safari macOS | 13+ | 13+ | never |

([MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/css/properties/touch-action.json), [caniuse](https://caniuse.com/css-touch-action).)

**The stale-advice trap:** [CSS-Tricks' `touch-action` almanac](https://css-tricks.com/almanac/properties/t/touch-action/) still says *"iOS Safari has limited support, only for the `auto` and `manipulation` values."* True through iOS 12, wrong now, and it ranks highly in search — it is the source of most "touch-action doesn't work on iOS" claims anyone will bring to this discussion.

**But element-scoped `touch-action` has real reliability reports against it on iOS, and one of them is our exact case:**

- [chartjs-plugin-zoom#943](https://github.com/chartjs/chartjs-plugin-zoom/issues/943) (Jan 2026) — `touch-action` on a `<canvas>`, and it *"zooms page and not the line chart."* That is this bug, on a canvas, reported this year.
- [pmndrs/use-gesture#486](https://github.com/pmndrs/use-gesture/issues/486) (iOS 15.4.1, iPhone 12) — documented `touch-action` on the draggable element did not hold; any non-perfectly-horizontal drag handed the gesture to the page. Chrome on iOS unaffected.

Consequently most working write-ups apply it broadly — [paulau.dev](https://paulau.dev/blog/disable-pinch-zoom-on-ios-safari/) uses `* { touch-action: pan-x pan-y }`, [dev.to/jasperreddin](https://dev.to/jasperreddin/disabling-viewport-zoom-on-ios-14-web-browsers-l13) uses `body { touch-action: pan-y }`, and **MDN's own [Pinch zoom gestures](https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Pinch_zoom_gestures) tutorial puts `touch-action: none` on `<body>`**. That page-wide application is exactly the accessibility failure in §2.4 — but note that inside *this* artifact's document, "page-wide" means the map document only, which is a legitimate scope (§3.5).

Also: `-webkit-text-size-adjust` — I looked for an interaction with `touch-action` or pinch-zoom and **found none documented**. It governs text auto-inflation, not zoom gating. Do not assume a connection.

### A4 — double-tap zoom

[WebKit, *More Responsive Tapping on iOS*](https://webkit.org/blog/5610/more-responsive-tapping-on-ios/):

- WebKit waits **350 ms** before activating a single tap, because it must see whether a double-tap-to-zoom follows.
- `touch-action: manipulation` *"makes WebKit consider touches that begin on the element only for the purposes of panning and pinching to zoom"* — no double-tap consideration, taps dispatch immediately, and it *"is fast for all zoom scales."*
- `manipulation` = `pan-x pan-y pinch-zoom`: **kills double-tap zoom, keeps pinch zoom.** The accessibility-safe choice for tappable controls — which is exactly what `client/src/index.css:685` already uses.
- `none` kills pinch, double-tap **and** panning. That is what the map canvas wants, and only the map canvas.

### A5 — pinch over a same-origin iframe: the key question, honestly

**What is established:**

1. `touch-action` **does not cascade into an embedded browsing context** — normative note from [w3c/pointerevents#334](https://github.com/w3c/pointerevents/pull/334), filed off a WebKit engineer's finding in [#325](https://github.com/w3c/pointerevents/issues/325). Setting it on the `<iframe>` element governs nothing inside.
2. The child has **no visual viewport of its own** — [MDN Viewport concepts](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/CSSOM_view/Viewport_concepts); `visualViewport.scale` reads `1` inside an iframe even while the top page is zoomed ([csswg-drafts#8434](https://github.com/w3c/csswg-drafts/issues/8434), plus a WPT manual test).
3. Field reports of the top-level page claiming the gesture over iframe content: [pdf.js#16328](https://github.com/mozilla/pdf.js/issues/16328) is an **iOS** report — *"when zooming in on iOS, it uses the native zoom from Safari/WebKit/UIkit, meaning the toolbar may disappear and the text gets blurry."* That is the founder's symptom, in an iframe, on iOS. [react-zoom-pan-pinch#528](https://github.com/BetterTyped/react-zoom-pan-pinch/issues/528) reports the same shape (*"when my fingers are on the iframe it does not pinch zoom, it instead zooms the entire page"*) but was tested on Android Chrome and macOS Arc, **not iOS** — same class, different platform, so weight it less.

**What is NOT established, and this is the pivot of the whole plan:**

> **No source tests whether `touch-action: none` or a `gesturestart` `preventDefault()` set *inside* the iframe document can suppress the *top-level* page's pinch-zoom on iOS.**

The spec architecture points against it: the element that implements page zoom is the top-level viewport, which is outside the inner document's ancestor chain, and the inner document has no visual viewport at all. But that is inference, not a tested result. Nothing found even confirms that `gesturestart` fires inside an iframe document on iOS.

**Therefore the first thing to do is not a fix, it is a 20-minute experiment** (§3.2). Every plan below branches on its answer.

### A6 — detecting and recovering from an accidental page zoom

- `window.visualViewport.scale` is the pinch-zoom factor ([Chrome's introduction](https://developer.chrome.com/blog/visual-viewport-api)); `resize` fires when width, height **or scale** changes. Safari support arrived in **Safari 13** ([WebKit blog](https://webkit.org/blog/9674/new-webkit-features-in-safari-13/)).
- Caveats: desktop *browser* zoom does not move `scale` (only pinch does), and inside an iframe it is always `1`. **Read it from the parent** (`LivingMap.tsx`), never from the artifact.
- **There is no way to reset it.** The CSSWG [resolved to add `VisualViewport.prototype.resetScale()`](https://lists.w3.org/Archives/Public/public-css-archive/2024Feb/0486.html) but it is **not in the [cssom-view draft](https://drafts.csswg.org/cssom-view/#visualViewport) and not implemented anywhere**. The motivating issue, [csswg-drafts#9787](https://github.com/w3c/csswg-drafts/issues/9787), is literally this scenario: a map where pinch should zoom the map, and *"on close we want to reset the user scaling to 1.0. Otherwise, some of the controls might be out of view and might not be reachable."*
- The viewport-meta rewrite hack (force `maximum-scale=1`, then restore) is **widely reported as unreliable on iOS 10+** precisely because Safari caches the zoom state and ignores meta updates after a user-initiated zoom. Best-effort only; never a guarantee.
- Chrome's own guidance: *"you should think carefully before doing anything that overrides the user's desire to zoom in."*

**Practical consequence:** don't fight an accidental zoom. Detect `scale > 1` in the parent and offer a visible, dismissible **"Reset view"** control the user presses. That also doubles as the telemetry that tells us whether the fix worked in the field.

## 2.3 First-run gesture tutorials — what the evidence actually says

**The headline is uncomfortable and should be said plainly: most first-run gesture tutorials do not help, and measurably make the product feel harder.**

[NN/g's quantitative study](https://www.nngroup.com/articles/mobile-tutorials/) (Kendrick, Mar 2020; n=70, between-subjects, 4 iPhone apps, tutorial vs. skip):

| | Saw tutorial | Skipped | Significant? |
|---|---|---|---|
| Task success | 91% | 94% | no |
| Time on task | 93.5 s | 85.2 s | no |
| **Perceived ease** (higher = easier) | **4.92** | **5.49** | **yes** |

NN/g's conclusion: tutorials *"don't make users faster or more successful at completing tasks; on the contrary, they make them perceive the tasks as more difficult."*

Corroborated at scale by [Andersen et al., CHI 2012](https://grail.cs.washington.edu/projects/game-abtesting/chi2012/chi2012.pdf) — 8 tutorial designs, 3 games, **~45,000 players**: tutorials raised play time up to 29% in the *most complex* game and produced **no significant gain in the two simpler ones**. Tutorial investment pays off only where the mechanics cannot be discovered by experimentation.

And **Apple classifies pinch-to-zoom and drag-to-pan as *standard* system gestures** ([HIG Gestures](https://developer.apple.com/design/human-interface-guidelines/gestures)). Teaching a standard gesture is teaching someone to walk.

### The consensus rules, each sourced

| Rule | Source |
|---|---|
| Don't front-load a wall of instructions | [NN/g push vs pull](https://www.nngroup.com/articles/onboarding-tutorials/); [Material: "don't force education upfront"](https://m1.material.io/growth-communications/onboarding.html); [Apple: avoid splash screens when a new player opens your app](https://developer.apple.com/app-store/onboarding-for-games/) |
| Teach by doing | [Apple HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding): people *"grasp and retain information better when they can actually perform the task"* |
| One tip at a time; no chains | [NN/g instructional overlays](https://www.nngroup.com/articles/mobile-instructional-overlay/); [Material feature discovery](https://m1.material.io/growth-communications/feature-discovery.html): *"don't display more than one per session"* |
| Trigger contextually, not at launch | Material feature discovery; Apple: *"display these instructions near that area"* |
| **Don't style the hint like real UI** | [NN/g guideline #4](https://www.nngroup.com/articles/mobile-instructional-overlay/) — in their Wimbledon study, users **tried to tap the tutorial annotations** |
| Dismissible, and dismissal is respected | Material: *"if the user dismisses a message, don't show it again for a more substantial period"* |
| Shown once — **but keep a permanent way back to it** | [Apple HIG Onboarding](https://developer.apple.com/design/human-interface-guidelines/onboarding), verbatim: *"don't present it again on subsequent launches, but make sure it's easy for people to find if they want to view it later"* |
| Don't obscure the map | [Apple HIG Maps](https://developer.apple.com/design/human-interface-guidelines/maps): *"Noninteractive elements that obscure the map can interfere with people's expectations for how maps behave."* |
| A gesture is never the only path | Apple HIG Gestures: custom gestures must not be *"the only way"* |

### The one map-specific pattern that is provably good: teach on failure, not on arrival

Cooperative gestures are the best-documented just-in-time gesture hint in the map space. The map **refuses the wrong gesture and flashes the instruction at that exact moment** — *"Use two fingers to move the map"* on touch, *"Use ctrl + scroll to zoom the map"* on desktop — then it vanishes. There is no first-run overlay at all. ([Google Maps `gestureHandling: 'cooperative'`](https://developers.google.com/maps/documentation/javascript/interaction), [Mapbox `cooperativeGestures`](https://github.com/mapbox/mapbox-gl-js/issues/12109), [MapTiler](https://docs.maptiler.com/sdk-js/examples/cooperative-gestures/), [Leaflet.GestureHandling](https://github.com/elmarquis/Leaflet.GestureHandling).)

**The best product teardown is Pokémon GO**, by [Krystal Higgins](https://first-run-ux.kryshiggins.com/pokemon-go-ios-first-time-user-experience-the/) (author of *Better Onboarding*):

- **What works:** the throw gesture is taught inside real gameplay — the game spawns three starter Pokémon and puts you in authentic capture mode. **If you fumble, an inline cue appears showing the throw path.** A *failure-triggered* hint, not a first-run overlay.
- **What fails:** the Professor's *"modal speech bubbles, preventing user interaction until the sequence is complete"* make players *"button mash the screen so that they can exit to the interactive portion."*

Higgins' general position: *"The best onboarding experiences guide people as they interact, instead of explaining things in narrative form."*

**Counterexample worth holding in mind:** Google Maps' one-finger zoom (double-tap, hold, drag) shipped years ago and is *still* written up by tech press as a "secret trick". A useful gesture with no signifier stays undiscovered indefinitely. So the answer is not "never hint" — it is "hint about the *non-obvious* thing, at the moment it would have helped."

**Tightest published spec for the hint itself:** [Wear OS gesture hints](https://developer.android.com/design/ui/wear/guides/patterns/gestures) — a **floating hint**, "an animated icon contained within a small bubble overlay that points to the UI element that the gesture affects", because *"subtle hints are clearer and more legible, causing minimal obstruction of other UI elements."* Cadence: at least once on first launch, then at most once per day.

**What could not be sourced, and should not be claimed:** no case study exists for Figma/FigJam canvas gesture onboarding; no documentation that Apple Maps or Google Maps has ever shipped a first-run gesture coach mark. And the skip-rate statistics that dominate search ("70% skip onboarding", "78% abandon tours") all trace to uncited marketing blogs — **do not put those in a deck**. The defensible numbers are the NN/g n=70 and the CHI 2012 n=45,000 above.

## 2.4 The accessibility floor — with the actual success criteria

### The criteria that govern a map, in the order they bite

**SC 2.5.1 Pointer Gestures — Level A.** This is the one that governs pinch, and it is **Level A**, not AA. [Normative](https://www.w3.org/WAI/WCAG22/Understanding/pointer-gestures.html): *"All functionality that uses multipoint or path-based gestures for operation can be operated with a single pointer without a path-based gesture, unless a multipoint or path-based gesture is essential."* The definition of multipoint gesture explicitly names *"a two-finger pinch/spread zoom."*

The Understanding document's worked example **is this application**: *"A website includes a map view that supports the pinch/spread gesture to zoom… As a single-pointer alternative, the map also includes plus/minus buttons to zoom in and out."* Map zoom is **not** "essential" — the +/− buttons are proof that an alternative exists. **This makes the pocket zoom buttons a Level A conformance item, not a nice-to-have.**

**SC 2.5.7 Dragging Movements — AA, new in 2.2.** Covers **pan** (the words "pinch" and "zoom" do not appear in it). Its first example is a map with directional buttons. The user-agent exception does not save a JS map that intercepts pointer events. And, verbatim and load-bearing for this codebase: *"Achieving keyboard equivalence for a dragging operation does not automatically meet this success criterion, unless that equivalent keyboard operation also provides controls that can be clicked or tapped with a pointer."* **Keyboard alone does not satisfy 2.5.7.** The artifact *has* arrow-key panning (`grounds-v0.html:4221–4226`) and it is not enough.

**SC 1.4.4 Resize Text — AA.** *"Text can be resized without assistive technology up to 200 percent without loss of content or functionality."* **There is no map exception** — only captions and images of text are excluded. You cannot borrow the Reflow carve-out to justify blocking zoom. Any *one* scaling mechanism suffices, and on a phone pinch-zoom is that mechanism; suppress it page-wide and you have removed the last one.

**SC 1.4.10 Reflow — AA.** Content must work without two-dimensional scrolling at 320×256 CSS px, *"Except for parts of the content which require two-dimensional layout for usage or meaning."* The Understanding document's example list names, verbatim: *"images required for understanding (such as maps and diagrams), video, games, presentations, data tables… and interfaces where it is necessary to keep toolbars in view while manipulating content."* Three constraints on that exception: it is **per-part, not per-page** (the canvas is exempt; the chrome around it is not); *"require… for usage or meaning"* is a necessity test; and the toolbar clause explicitly blesses **a fixed zoom-control cluster pinned over a map**.

**SC 2.5.8 Target Size (Minimum) — AA, new in 2.2.** Zoom buttons must be ≥24×24 CSS px, or spaced so that 24px circles centred on each do not intersect. (The shell's own back button at `LivingMap.tsx:646` already uses `min-h-[44px] min-w-[44px]`, so the house standard is 44 and comfortably clears this.)

**SC 2.1.1 Keyboard — Level A.** Panning to a location is endpoint-oriented, not path-dependent, so no exception applies. Already satisfied by `grounds-v0.html:4221–4226`.

### On the viewport meta specifically — and a correction worth internalizing

**F69 is *not* the viewport failure technique.** [F69](https://www.w3.org/TR/WCAG-TECHS/F69.html) is about text being clipped or truncated on resize; it never mentions the viewport tag, `user-scalable`, or pinch-zoom. **No W3C Failure Technique addresses `user-scalable=no` at all.** Citing F69 for it is a common misattribution and will get an audit finding thrown out.

The real W3C artefact is [**ACT Rule b4f0c3, "Meta viewport allows for zoom"**](https://www.w3.org/WAI/standards-guidelines/act/rules/b4f0c3/) — W3C-published but *informative*, referenced from the 1.4.4 and 1.4.10 Understanding docs. Expectation 1: no `user-scalable: no`. Expectation 2: no `maximum-scale` below 2. **`client/index.html:6` passes both** (`maximum-scale=5`, no `user-scalable`).

Its Assumptions section is the most useful nuance available: a page can satisfy 1.4.4/1.4.10 while failing this rule if *"there is another mechanism available to resize the text content"* or the content does not need to reflow into 320×256.

Tooling is stricter than W3C: [Deque axe `meta-viewport`](https://dequeuniversity.com/rules/axe/4.10/meta-viewport) — "Zooming and scaling must not be disabled", **impact Critical**, no exception path. (The `meta-viewport-large` / 500% rule is a **Deque best practice, not a WCAG requirement** — don't conflate them.) This is genuinely contested territory: W3C's own rule allows alternate mechanisms; axe treats it as Critical. Both are defensible, and this codebase currently satisfies the strict reading, which is a good place to be. **Don't give that up.**

### The accepted pattern, in four parts

1. **Scope gesture capture to the surface, never the page.** Cooperative gestures exist for this reason — Mapbox's own rationale: *"This allows the user to scroll the page without unintentionally zooming or panning the map."* On the CSS side: prefer `pan-x pan-y pinch-zoom` / `manipulation` over `none` wherever the surface can tolerate it, and reserve `none` for the canvas that genuinely takes both gestures.
2. **Explicit +/− zoom and directional pan buttons**, as real `<button>` elements. Required by SC 2.5.1's own remedy text (technique G215) and the only thing that satisfies 2.5.7's "clickable, not just keyboard" clause.
3. **Keyboard on top of that**, active only while the map holds focus — [W3C's analysis of 11 map widgets](https://www.w3.org/2020/maps/supporting-material-uploads/presentations/Nic_Chan/index.html) calls "active only on focus" the web-maps de-facto standard and found **7 of 11 tools failed** keyboard requirements.
4. **Tell people the gestures exist.** [W3C Mobile Accessibility note](https://www.w3.org/TR/mobile-accessibility-mapping/) §4.6: *"Instructions… should be provided to explain what gestures can be used to control a given interface and whether there are alternatives."* This is the standards hook for §2.3's hint.

### Is disabling page zoom ever acceptable?

**No authority says yes outright.** The nearest is W3C's ACT assumption that another 200% text-scaling mechanism can carry conformance. Deque and MDN say no flatly; [Adrian Roselli's "Don't Disable Zoom"](http://adrianroselli.com/2015/10/dont-disable-zoom.html) is the standing community position. **Scoping capture to a canvas is not "disabling zoom" and is not what these sources are objecting to** — the objection is to the page-wide viewport-meta lock. Keep the distinction sharp when this is discussed.

---

# PART 3 — Recommendation for this codebase

## 3.1 The minimal change (P0) — and why it is not one line

Ordered. Do all of them; any one alone leaves the map broken. (Run the experiment in §3.2 first — it can invalidate P0.1 and P0.3.)

### P0.1 — `touch-action: none` on the map canvas

`docs/prototypes/grounds-v0.html:16`:

```css
/* was */ #scene{position:absolute;inset:0;cursor:grab}
/* becomes */ #scene{position:absolute;inset:0;cursor:grab;touch-action:none}
```

This is the same declaration already on `#orgSvg` (`:541`) and `.lgrip` (`:451`). It must be in the **stylesheet**, not applied on `pointerdown` — MDN: *"After a gesture starts, changes to `touch-action` will not have any impact on the behavior of the current gesture."*

Consider `touch-action: none` on the pocket HUD strips too (`#pbar` `:773`, `#vitals` `:769`) so a mis-aimed pinch that starts on the bottom bar does not become a page zoom either.

**This alone does not fix responsiveness** — MEASURED, runs C and D. Do not ship it alone and call it done.

### P0.2 — stop the desktop pointer path from running on touch

This is the fix for "incredibly unresponsive", and it is the highest-value change in this document. Two edits at `grounds-v0.html:2146` and `:2152`, both a single guard:

```js
cv.addEventListener('pointerdown',e=>{
  if(e.pointerType==='touch')return;      // the pocket touchNav handler owns fingers
  ...
addEventListener('pointermove',e=>{
  if(e.pointerType==='touch')return;      // ditto
  ...
```

`pointerup` at `:2156` should clear `dragging` unconditionally (it is idempotent). Guarding on `pointerType` rather than on `body.pocket` is deliberate: a touchscreen laptop is `desk` profile with real fingers, and the `hud=desk` override exists.

Consequence to handle: Path A is also what supplies inertia (`cam.vx/vy` at `:2153`) and what cancels an in-flight camera `travel` (`:2150`). Both must move into `touchNav` — the `travel=null` is already there at `:7862`, the velocity is not. See P1.2.

**MEASURED expectation:** run E is the closest available proxy — with Path C disabled, Path A alone produced 1046.9 against a correct 1000 (+47 inertia tail). With the guard, Path C alone should produce **exactly 1000 plus whatever inertia you deliberately add**.

### P0.3 — keep the WebKit gesture events, and widen them

`grounds-v0.html:2163–2168` already prevents `gesturestart`/`gesturechange`/`gestureend` on `cv`. Keep it — on iOS it is the belt to `touch-action`'s braces. Two changes:

- Add a document-level `gesturestart` → `preventDefault()` **inside the artifact only**, so a pinch that begins a few pixels off the canvas (on the `#vitals` strip, on a badge) still does not become a page zoom. Scope it to the artifact document; never add it to the parent app.
- The `safariPinch` anchor is frozen at `gesturestart` (`gx,gy` at `:2164`). Track the live midpoint instead, for the reason in §2.1.

### Where `touch-action` goes — corrected

**On `#scene` inside the artifact, and that is the load-bearing placement.** My first read of this was wrong and the correction matters: **`touch-action` does not cascade into an embedded browsing context** ([w3c/pointerevents#334](https://github.com/w3c/pointerevents/pull/334), §2.2/A5). Putting `touch-action: none` on the `<iframe>` element in `LivingMap.tsx:686–694` does **not** govern touches that land on the canvas inside it. Add it anyway — it costs nothing and covers gestures on the frame's own box — but **do not count it as the fix**, and do not let anyone report "we set touch-action on the iframe" as done.

`overscroll-behavior: none` on the shell div at `LivingMap.tsx:610` is worth adding for the same cheap-and-harmless reason; the parent's `document.body.style.overflow = "hidden"` (`:158–162`) already does most of that job.

## 3.2 Iframe or parent — who should own the gestures?

### Do this experiment first. It decides the architecture, and it takes twenty minutes.

The open question from §2.2/A5 is: **can the inner document suppress the outer page's pinch-zoom on iOS?** No source answers it. Everything below branches on it, so measure it before building anything.

**The experiment.** Deploy (or serve over a tunnel) two static pages and open both on the founder's iPhone:

- **Page A:** a bare page containing one full-screen same-origin iframe. Inside the frame: a canvas with `touch-action: none`, `gesturestart`/`gesturechange` handlers calling `preventDefault()` with `{passive:false}`, and a readout of the *parent's* `visualViewport.scale` posted up via `postMessage`.
- **Page B:** the same canvas as a top-level document, no iframe.

Pinch each. Record `visualViewport.scale` from the parent in both cases.

| Result | Meaning | Plan |
|---|---|---|
| A stays at `scale === 1` | The child *can* refuse the gesture across the boundary | **Ship P0 as written.** The iframe keeps the gestures. |
| A zooms, B stays at 1 | The seam is the bug | Escalate to the fallbacks below |
| Both zoom | `touch-action` is not holding on this iOS version at all | Fall back to cooperative gestures, and re-read §2.2/A3's field reports |

Nobody should write the pinch-midpoint code before this is known.

### If the child can hold the gesture: the iframe keeps them

**The iframe keeps them.** Reasons, in order:

1. **The camera lives in the child.** `cam` is a script-scope `const` at `:2093`; the parent cannot read or write it except through `postMessage`. Moving gesture handling to the parent means round-tripping every `touchmove` across the frame boundary — a message per finger movement at 120 Hz, arriving a frame late. That trades a correctness bug for a latency bug, and latency is the thing the founder is already complaining about.
2. **The child already has the whole implementation**, correct anchor maths included (`:2165–2167`). It needs guards and a midpoint, not a rewrite.
3. **The parent cannot see the touches anyway.** Touch events inside a same-origin iframe do not bubble to the parent document. The parent would have to reach into `contentWindow` and bind there — which is possible (`:452` proves same-origin access) but is exactly the coupling the file header at `:1–40` says the shell must not create ("nothing here reimplements any of it").

**What the parent must contribute**, whatever the experiment says, is the one thing only the parent can do: **watch `visualViewport.scale`**. The child is structurally blind to page zoom (§1.4 point 3), so `LivingMap.tsx` should carry a small effect that listens for `visualViewport` `resize`, and when `scale > 1` shows a single dismissible **"Reset view"** affordance. There is no API to reset it (§2.2/A6), so the control's real job is twofold: give the visitor a way out of a state they did not ask for, and give us a field signal for whether the fix actually held on real devices. Ship this regardless of the experiment's outcome — it is the only instrumentation that can tell us the truth from the founder's phone.

### If the child cannot hold the gesture: two fallbacks, in order

**Fallback 1 — drop the iframe on mobile.** The cleanest structural answer, and more tractable here than it sounds: navigate the pocket profile straight to `/grounds/index.html` as a **top-level document** rather than framing it. The seam disappears entirely, `touch-action` and `gesturestart` are then unambiguously in the top-level document where they are known to work (§2.2/A3, A2), and `visualViewport` becomes readable by the map itself. What it costs: the shell's back button (`LivingMap.tsx:646`), the skin/scene push over `postMessage`, and the `409` relay. Mitigations already exist — the artifact guards on `window.parent!==window` (`grounds-v0.html:2144`), reads `location.hash` for deep links, and posts its walk log straight to `/api/map/walk-log` (`:8047`) with no parent involvement. This is a real piece of work, not a one-liner, but it removes an entire class of problem rather than working around it.

**Fallback 2 — cooperative gestures.** Google's `gestureHandling: "auto"` resolves to `cooperative` *specifically because* the map is in an iframe, so this is the industry's sanctioned answer to exactly this situation. Two fingers to pan, an informational flash on a one-finger drag. It should be the retreat position and not the opening move, because this map **is** the whole screen (`LivingMap.tsx:610`, `fixed inset-0`) — there is no page behind it to scroll, which is the entire premise cooperative gestures are designed around. Adopting it here would mean asking for two fingers to do a thing that has nothing to compete with.

## 3.3 On "hyper reactive" — evaluate honestly

**The founder's instinct is a workaround for the real bug, and adopting it would make the map worse.** Stated plainly so it can be disagreed with:

The theory behind "make our zooming hyper reactive so people do very small [gestures]" is: if a tiny finger movement produces a big zoom, the user never opens their fingers far enough for the phone to notice. That would be a real strategy if the browser's gesture were unavoidable. It is not — it is avoidable with one CSS declaration that the same file already uses twice (`:451`, `:541`).

Three concrete reasons it backfires:

1. **The browser does not arbitrate on distance, it arbitrates on finger count and timing.** iOS starts a pinch as soon as a second finger lands and the surface has not declined the gesture. A 5 px pinch and a 200 px pinch are claimed identically. High gain does not dodge the arbitration; it just makes whatever the map *does* receive violent.
2. **We already have a measured example of what "too much gain" feels like, and it is the bug being reported.** The pan is currently running at ~2.4× gain (§1.7, run A) purely by accident, and the founder's word for that experience is "incredibly unresponsive". Deliberately adding gain to the zoom would reproduce that feeling on the other axis. Direct manipulation wants gain **exactly 1.0**: the pixels under your fingers stay under your fingers. Every reference implementation computes zoom as the raw distance ratio (Leaflet `p1.distanceTo(p2)/this._startDist`; MapLibre `Math.log(distance/lastDistance)/Math.LN2`) with **no gain factor anywhere**.
3. **It fights the thresholds, which exist for the opposite reason.** MapLibre requires `ZOOM_THRESHOLD = 0.1` zoom levels of movement before a pinch counts at all, precisely so that a two-finger tap or a slight finger splay during a pan does not jolt the zoom. Best practice adds a dead zone; "hyper reactive" removes it.

**What the founder is actually right about**, and should be built: the map must respond *immediately* — first frame, no threshold delay, no 300 ms tap wait, no lag between finger and land. That is a **latency** requirement, not a gain requirement, and P1.3 (rAF batching) plus P0.2 (one handler instead of two fighting) is how you deliver it. Frame the answer to him that way: "you're right that it has to feel instant; the way to get instant is to stop two handlers arguing, not to amplify the gesture."

**If a knob is wanted anyway:** the honest version is a *zoom-rate* exponent applied only to the WebKit `gesturechange` path on desktop trackpads, where the OS already applies its own acceleration. On touch, keep gain at 1.0.

## 3.4 The first-run mobile tutorial

The good news: **the content is already written, the once-only gate already exists, and the telemetry already exists.** Nothing needs inventing.

- The words: `grounds-v0.html:8002` — *"drag the land to look around"*; `:8008` — *"pinch to zoom the world"*. Founder-authored, already in the village's voice, currently never displayed (§1.6).
- The gate: `localStorage['amora-walk-done']` (`:8027`, `:8059`).
- The trigger: the pocket boot at `:8093–8096`, already firing 700 ms after load for first-timers only.
- The counter: `WALK_LOG` → `sendWalkLog()` → `POST /api/map/walk-log` (`:8040–8053`).
- The dead CSS: `#walkCard .wgate` at `:814`.

The bad news, and it should go to the founder straight: **the research does not support building the tutorial he asked for.** §2.3 has the numbers — NN/g's n=70 study found first-run tutorials produced no gain in success or speed and a *statistically significant drop in perceived ease*; CHI 2012's n≈45,000 found tutorials pay off only for mechanics that cannot be discovered by experimentation. And Apple classifies pinch-to-zoom and drag-to-pan as **standard system gestures** — the two gestures in question are the two least in need of teaching on the entire device.

That is not a reason to do nothing. It is a reason to build the *smaller, better* thing, and there are three parts to it:

**1. The real fix for discoverability is P0.** Right now a newcomer drags the land, it shoots 2.4× too far, and they conclude the map is broken. No tutorial survives that. Once the map tracks the finger 1:1, the gesture teaches itself — which is precisely what the evidence predicts for a standard gesture on a responsive surface.

**2. A single hint, non-blocking, self-dismissing on success.** Not a modal, not a carousel, not a chain:

- **One floating hint** over a **live and fully interactive** map — the [Wear OS floating-hint spec](https://developer.android.com/design/ui/wear/guides/patterns/gestures) is the tightest published pattern: a small animated glyph in a bubble, *"minimal obstruction of other UI elements."* Apple HIG Maps is explicit that elements obscuring the map break expectations.
- **Visually distinct from real UI.** NN/g's Wimbledon study found users *tried to tap the tutorial annotations*. It must not look pressable.
- **The words already exist:** `grounds-v0.html:8002` *"drag the land to look around"* and `:8008` *"pinch to zoom the world"*. Founder-authored, in voice, never yet displayed.
- **Self-dismissing on success — this is what `WGATE` was built for and never wired to.** Add the *reader* it has never had (§1.6): when `WGATE.pan` and `WGATE.pinch` are both true, fade the hint. Anyone who already knows how to use a map never sees it for more than a second. This is the mechanism that makes the hint cost ~nothing for competent users, which is exactly what NN/g's data says a tutorial must do.
- **Backstop dismissal:** auto-fade after ~8 s, plus an explicit control at the house 44 px standard.
- **Once only, own flag.** `amora-gestures-seen`, **separate from `amora-walk-done`** so dismissing one does not silently dismiss the other.
- **Permanent way back in.** Apple HIG Onboarding, verbatim: *"don't present it again on subsequent launches, but make sure it's easy for people to find if they want to view it later."* The pocket help sheet (`#pbAsk`, `grounds-v0.html:7870`) is the natural home.

**3. A failure-triggered hint, which is the pattern that actually works.** This is the Pokémon GO lesson and the cooperative-gestures lesson in one: **show the instruction at the moment it would have helped, not on arrival.** Concretely — if a visitor taps the canvas three times inside a few seconds with no `WGATE.pan` and no panel opening, they are poking at a map they think is a picture. *That* is the moment to surface "drag the land to look around." Cheap to implement, targets only the people who need it, and invisible to everyone else.

**Two things not to do:**

- **Never gate progress on a gesture.** The Welcome Walk must stay passable without performing either one. If `WGATE` is re-wired as a *gate* rather than a *dismissal signal*, a device where pinch fails traps the newcomer permanently on step w3 with no way forward. Today's write-only `WGATE` is accidentally protecting us from that; a careless "let's use these fields" pass would introduce it.
- **Don't stack it on the Welcome Walk's opening.** The walk already fires at 700 ms and flies the camera (`:8093–8096`). A hint saying "drag the land" while the land is flying under an automated camera reads as a malfunction. Show the gesture hint after the first stop settles, or on a pocket load where the walk is already done.

**Order of work: ship P0 first.** A tutorial that teaches a broken gesture is worse than no tutorial — it turns "this app is janky" into "this app is janky and it is lying to me".

## 3.5 The accessibility-safe way

Non-negotiable constraints, in the order they bite:

1. **Never touch the viewport meta.** `client/index.html:6` stays exactly as it is. Do not add `user-scalable=no`; do not lower `maximum-scale`. It is an accessibility failure and it does not work on iOS anyway (§2.2). Anyone proposing it should be shown this line.
2. **Scope every gesture capture to the map surface.** `touch-action: none` belongs on `#scene`, on the artifact's pocket HUD strips, and on the `<iframe>` element — and **nowhere else**. Every other page in the app keeps full browser pinch-zoom. This is the entire difference between "a canvas that owns its gestures", which is normal and fine, and "an app that disabled zoom", which is not.
3. **Provide the non-gesture path. This is Level A, not polish.** SC 2.5.1 Pointer Gestures is **Level A**, its definition of "multipoint gesture" names two-finger pinch explicitly, and its Understanding document's worked example is *this exact application* — a map, with plus/minus buttons as the single-pointer alternative (§2.4). The map currently has **no on-screen zoom control on pocket**: `grounds-v0.html:767` hides `#dock`, `#mapSel`, `#minimapWrap`, `#layers` and the rest wholesale on `body.pocket`. Add **+ / − zoom buttons** and **directional pan buttons** to the pocket chrome (`#pbar` at `:773` is the natural home — fixed, 60 px tall, already slotted), as real `<button>` elements at the house 44 px standard (SC 2.5.8 needs only 24). This is also **the fastest relief available to the founder personally**, since it works regardless of how the gesture question resolves.
4. **Keyboard already exists — and is not sufficient on its own.** `grounds-v0.html:4221–4226` binds arrow keys to pan (`const pan=42/cam.z`) and `+`/`=`/`-` to zoom, correctly skipping `INPUT|TEXTAREA|SELECT`. That satisfies SC 2.1.1. It does **not** satisfy SC 2.5.7 Dragging Movements, which says verbatim that keyboard equivalence *"does not automatically meet this success criterion, unless that equivalent keyboard operation also provides controls that can be clicked or tapped with a pointer"* (§2.4). So item 3 is required *in addition*, not as a substitute. Worth also confirming the keyboard path is reachable — a canvas needs an explicit `tabindex` and a visible focus ring to be operable at all, and the W3C's survey of 11 map widgets found 7 failing here.
5. **Respect reduced motion for inertia.** `MapPeek.tsx:50` already checks `prefers-reduced-motion` and the app sets `reducedMotion="user"` at `App.tsx:402`. Momentum panning is motion; under `reduce`, land the pan on release with no fling.
6. **Do not remove the `dblclick`-to-zoom** at `:2162`. With `touch-action: none`, iOS's own double-tap zoom stops firing on the canvas (§2.2/A4), so this handler *becomes* the map's double-tap-to-zoom. It also stops being subject to WebKit's 350 ms tap delay, which is a free responsiveness win on every tap.
7. **Add the "Reset view" escape hatch in the parent** (§3.2). If a page zoom does slip through, the visitor is stranded with the map's controls off-screen and no API exists to undo it (§2.2/A6). A single dismissible control in `LivingMap.tsx`, shown only when `visualViewport.scale > 1`, is the difference between a bad moment and a dead end.

## 3.6 Test and verification plan

**The house trap, restated:** `docs/prototypes/MAP_LANE_HANDOFF_2026-08-10.md:245–247` — *"Playwright's `isMobile` lies on this Chromium. A 390×844 context reports `innerWidth` 1560 while `visualViewport` says 390. Pocket contexts use `hasTouch` alone."* Also `docs/prototypes/QA_ADDENDUM_ROUND_D.md:24–27` and the header comment of `qa/_probe_g3_pocket.js:2–4`. Every probe below uses `{ viewport: {width:390,height:844}, hasTouch: true, deviceScaleFactor: 3 }` and **never `isMobile`**.

**The second, undocumented trap — the existing pinch test cannot see this bug.** `docs/prototypes/qa/verify_features.js:1061–1080`:

```js
const el = document.getElementById('scene');
const T = (t, pts) => el.dispatchEvent(new TouchEvent(t, {
  bubbles: true, cancelable: true,
  touches: pts.map((p, i) => new Touch({ identifier: i, target: el, clientX: p[0], clientY: p[1] }))
}));
cam.z = 1.4; clampCam(); const z0 = cam.z;
T('touchstart', [[100, 400], [300, 400]]);
T('touchmove',  [[197, 400], [203, 400]]);
const z1 = cam.z;
```

This is green today and has been for weeks. It is blind to the reported bug for three independent reasons, each fatal on its own:

1. **The events are untrusted.** `el.dispatchEvent(new TouchEvent(...))` runs the page's listeners and nothing else. The browser's gesture arbitration never engages, so `touch-action` is never consulted and the page-zoom question is structurally unaskable. It also never generates the *pointer* events that a real finger generates — which is why the double-handling defect (§1.7) is invisible to it.
2. **It asserts only `z1 < z0` and the floor.** `cam.x` is never checked, so the +758 world-px sideways drift measured in §1.7 passes silently. This is the "computed, saved, never printed" shape.
3. **It loads the artifact directly** (`FILE + '#hud=pocket'`), not inside the shell's iframe. The seam that §1.4 argues is central is outside the test's reach entirely.

Do not delete it — it correctly guards the zoom-floor arithmetic. But it must not be cited as coverage for this.

### The four gates, weakest to strongest

**Gate 1 — a unit-shaped probe on the arithmetic (fast, runs in CI).**
Extend the existing block in `verify_features.js` to assert what is currently unmeasured:

- one-finger drag of N px at known `cam.z` moves `cam.x` by **exactly** `N / cam.z` (± the inertia you deliberately keep). Today: 2.4× too far.
- a pinch centred on the screen centre leaves `cam.x` and `cam.y` **unchanged** (± 1 world px). Today: off by 560–880.
- a pinch centred **off**-centre moves the world point under the midpoint by ≈ 0 px. This is the midpoint-anchor assertion and nothing tests it today.
- `getComputedStyle($('scene')).touchAction === 'none'`.
- the pinch ceiling agrees with `clampCam` (2.6 vs 3.2, §1.2 defect 4).

**Gate 2 — trusted input over CDP (the probe I ran; catches the double-handling).**
`ctx.newCDPSession(page)` → `Input.dispatchTouchEvent` produces trusted events, generates the real pointer stream, and engages Chromium's gesture arbitration. Scripts: `probe_touch3.cjs` / `probe_touch4.cjs` in this scratchpad. Assert the same numbers as Gate 1, plus:

- the event tally contains `touchmove` and **no** `pointermove` reaching the pan code (or, if you keep the pointer listeners, that they no-op on `pointerType==='touch'`);
- no `touchmove` arrives marked **non-cancelable** — that is the browser announcing it has taken the gesture, and it is the canary for a `touch-action` regression.

**Gate 3 — through the iframe, not the file.**
Every probe in `qa/` opens the artifact directly. Add one that boots the real client, navigates to `/map`, and drives touches at the **parent** page's coordinates, reading `cam` out of `frame.contentWindow`. This is the only automated gate that exercises the seam in §1.4, and it is the one that would catch a regression where someone adds a transform or a scroll container to the shell.

**Gate 4 — the real device. This is the only gate that closes the bug.**
Chromium cannot reproduce iOS pinch-to-zoom-the-page. Nothing in `qa/` can. The acceptance test is a human with an iPhone, on the deployed site, and it must be run by someone who can reproduce the original complaint — realistically the founder or anyone with an iOS device. Script it so it is five minutes, not an exploration:

| # | Action | Pass |
|---|---|---|
| 1 | Open `amora.regencivics.earth/map` in iOS Safari | Map fills the screen; HUD strip top, bar bottom |
| 2 | One finger, drag slowly across the map | Land tracks the finger **1:1**; the point under the finger stays under it |
| 3 | One finger, flick and release | Short glide, decelerates, stops inside the land |
| 4 | Two fingers, pinch out slowly | **The map zooms. The Safari chrome does not move. The address bar does not shrink/grow.** The point between the fingers stays between the fingers |
| 5 | Two fingers, pinch in hard and fast (the founder's failing case) | Same. Page does not zoom out; the tab does not scale |
| 6 | Two fingers, pinch starting **on the top vitals strip** and on the bottom bar | Page still does not zoom |
| 7 | Double-tap the land | Map zooms in one step; the page does not |
| 8 | Rotate to landscape, repeat 2 and 4 | Same behaviour |
| 9 | Pinch on any **other** page (`/quests`, `/`) | **Page zoom still works.** This is the accessibility check and it must pass |
| 10 | First-run: clear site data, reopen `/map` | Gesture hint appears once, map is draggable underneath it, it goes away and does not return |
| 11 | Repeat 4 **from an in-app browser** (a link tapped inside another app) and from Safari proper | Same in both. A `WKWebView` host can still honour viewport scale limits where Safari ignores them (§2.2/A1), so the two can genuinely differ — and the founder's screenshot may be an in-app view |

Add a cheap in-page canary for step 4/5 so it is not a judgement call: log `window.visualViewport.scale` from the **parent** page. If a pinch on the map ever leaves `visualViewport.scale > 1`, the page zoomed and the test failed, regardless of what it looked like. That single number turns steps 4–6 from "does it feel right" into a fact, and it can be surfaced in a debug corner behind `?debug=vv`.

Also confirm the deploy on the artifact, not the shell — `MAP_LANE_HANDOFF_2026-08-10.md:240–244`: `/health` for the SHA, `GET /grounds/manifest.json` for the content-hashed artifact URL, then fetch that URL and grep for a marker only the new work contains. `docs/prototypes/grounds-v0.html` is served straight from disk (`server/index.ts:22433`), and the service worker caches the hashed name aggressively (`client/public/sw.js`), so a phone that has opened the map before **will** need a hard reload or a new hash before it sees the fix. Expect at least one false "it's still broken" report from exactly this.

---

## 4. Priority summary

| # | Change | File:line | Effort | Fixes |
|---|---|---|---|---|
| **P0.0** | **The iframe experiment** (§3.2) — can the child refuse the gesture on iOS? | new, throwaway | ~20 min | Decides everything below; unsourced in the literature |
| **P0.1** | `touch-action: none` on the map canvas | `grounds-v0.html:16` | 1 line | Browser claiming the gesture |
| **P0.2** | `if(e.pointerType==='touch')return;` guard on both pointer handlers | `grounds-v0.html:2146`, `:2152` | 2 lines | **2.4× pan overshoot, 560–880 px pinch drift** |
| **P0.3** | Document-level `gesturestart` `preventDefault` inside the artifact; track the live midpoint | `grounds-v0.html:2163–2168` | ~6 lines | The iOS belt to `touch-action`'s braces |
| **P0.4** | `visualViewport.scale > 1` watcher + "Reset view" in the parent | `LivingMap.tsx` | ~20 lines | The only field signal we can read; strands nobody |
| **P1.1** | Anchor the pinch at the live midpoint | `grounds-v0.html:7863–7865` | ~6 lines | Map sliding out from under the fingers; gives two-finger pan free |
| **P1.2** | Move inertia + `travel` cancel into the touch path | `grounds-v0.html:7855–7866` | ~8 lines | Momentum lost when P0.2 lands |
| **P1.3** | rAF-batch camera updates; one update per frame | `grounds-v0.html:7859` | ~10 lines | Latency — the real content of the "hyper reactive" ask |
| **P1.4** | `touchcancel` + `pointercancel` listeners; finger-count transitions | `grounds-v0.html:7866` | ~6 lines | Gesture dying silently when one finger lifts |
| **P1.5** | Reconcile the zoom ceiling (2.6 vs 3.2) | `grounds-v0.html:7865` | 1 char | Pinch cannot reach the zoom a tap flies to |
| **P2.1** | **Zoom +/− and pan buttons in the pocket bar** | `grounds-v0.html:773` | small | **WCAG 2.5.1 Level A + 2.5.7 AA**; also immediate relief |
| **P2.2** | One self-dismissing gesture hint + a `WGATE` reader; failure-triggered variant | `grounds-v0.html:8020`, `:8093` | medium | The tutorial ask, in the shape the evidence supports |
| **P2.3** | Gates 1–3 in `qa/`; the Gate 4 device script | `qa/verify_features.js:1061` | medium | Stops the regression coming back |
| **P3** | *If P0.0 fails:* drop the iframe on pocket, or cooperative gestures | `LivingMap.tsx` | large | The structural escape hatch (§3.2) |

Also worth flagging, unrelated to gestures but found on the way: `LivingMap.tsx:41` imports `Layout` and never uses it.

---

## 5. The three biggest risks

1. **The wrong fix will look exactly like the right fix.** Two versions of this, and both are likely:
   - **Shipping the CSS one-liner and declaring victory.** `touch-action: none` is the famous answer, it is one line, and it is what everyone reaches for. **MEASURED: it changes the pan and pinch numbers by exactly zero** (runs C and D). P0.2 fixes what the founder called "unresponsive"; P0.1 fixes what he called "zooming the whole window". They are two different bugs with two different fixes and both must ship together, or he re-tests, finds the map still unusable, and stops trusting the diagnosis.
   - **Reaching for `user-scalable=no`.** It is wrong twice over: iOS has ignored it since iOS 10 ([WebKit blog](https://webkit.org/blog/7367/new-interaction-behaviors-in-ios-10/)) so it does nothing on his device — while Android Chrome, Edge and Firefox **do** still honour it, so it would break pinch-zoom for most Android visitors on every page of the village. The same applies more subtly to putting `touch-action: none` on the parent's `body` or the shell's `fixed inset-0` div. `client/index.html:6` currently passes W3C ACT rule b4f0c3 *and* Deque's Critical `meta-viewport` check; that is worth protecting deliberately rather than losing by accident.

2. **The iframe seam may make the whole P0 plan insufficient, and no source can tell us in advance.** §2.2/A5 establishes that `touch-action` does not cascade into an embedded browsing context, that the child cannot even *observe* a page zoom (`visualViewport.scale` reads 1 inside a frame), and that there are real iOS field reports of the top page claiming pinches over iframe content ([pdf.js#16328](https://github.com/mozilla/pdf.js/issues/16328)). What no source answers is the reverse direction — whether the child can *refuse* the gesture. If it cannot, P0.1 and P0.3 will do nothing on the founder's phone, the responsiveness fix from P0.2 will land and be reported as "better but still zooms the window", and the actual remedy is a structural change (drop the iframe on pocket, or cooperative gestures) that is an order of magnitude more work. **This is why P0.0 is a twenty-minute experiment and not an assumption.** Run it before anyone writes gesture code.

3. **Nothing in the automated suite can prove the fix on his device — and the suite is already green on the broken code.** `qa/verify_features.js:1061–1080` passes today for three independent reasons (§3.6): the events are untrusted so gesture arbitration never engages, only `z` is asserted so the 758-px drift passes silently, and it loads the artifact outside the iframe so the seam is out of reach. Chromium does not implement iOS page-zoom at all. Gate 4 — a human with an iPhone, following the ten-step script — is the only thing that closes this. Compounding it: the service worker caches the content-hashed artifact aggressively (`client/public/sw.js`), so the first re-test on a phone that has opened the map before may well hit the old build and report a false failure. Confirm the artifact hash changed (`GET /grounds/manifest.json`) *before* asking anyone to look.

---

*Document ends. Probe scripts referenced above: `probe_touch3.cjs`, `probe_touch4.cjs` in this scratchpad; run with `NODE_PATH` pointed at a tree that has `playwright` installed (this repo's `node_modules` has the browsers but not the package).*
