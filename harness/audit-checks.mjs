/**
 * The readability checks behind `pnpm ui:audit` (harness stories) and
 * `pnpm ui:audit:live` (the running app). One implementation, two runners.
 * The improvement loop that grows this file is in CLAUDE.md, "UI readability
 * gate". Each check's comment says what it guards and, where it came from a
 * miss, what slipped through first.
 *
 * Checks:
 *   contrast      text against the real background it sits on (WCAG 1.4.3)
 *   placeholder   placeholder text, 4.5:1
 *   typed text    what people type, against the field's fill
 *   field edge    text fields' outline or fill, 3:1 (WCAG 1.4.11)
 *   target        44px touch targets; links inside a sentence exempt
 *   keyboard      a role=button (link, checkbox...) that Tab can reach
 *                 (WCAG 2.1.1)
 *   overflow      sideways scroll
 *   focus         every control shows a visible change on keyboard focus
 *                 (WCAG 2.4.7), and a ring is not faint (under 3:1); a shape
 *                 inside an SVG shows it in what it draws
 *   colour only   links in running text need a cue besides colour, and a
 *                 chosen toggle, tab or chip must differ from its siblings by
 *                 more than colour (WCAG 1.4.1)
 *   main thread   no endless animation the compositor cannot run (typing lag)
 */

/** Installs window.__audit in the page: colour maths and the page-side checks. */
export function installAuditLib() {
  if (window.__audit) return;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const cache = new Map();
  // Let the browser convert any colour syntax (rgb, oklab, oklch, color(),
  // hex) by painting it on a 1px canvas and reading the pixel back. Miss that
  // taught this: Tailwind 4 gradients are oklab, which an rgb() regex skipped,
  // so dark pages measured as white.
  const parse = (c) => {
    if (!c || c === "transparent" || c === "none") return null;
    if (cache.has(c)) return cache.get(c);
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "rgba(0,0,0,0)";
    ctx.fillStyle = c;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const out = d[3] === 0 ? null : { r: d[0], g: d[1], b: d[2], a: d[3] / 255 };
    cache.set(c, out);
    return out;
  };
  const COLOUR_RE = /(rgba?|oklab|oklch|lab|lch|hsla?|color)\([^()]*\)|#[0-9a-fA-F]{3,8}/;
  const firstColour = (s) => {
    if (!s || s === "none") return null;
    const m = s.match(COLOUR_RE);
    return m ? parse(m[0]) : null;
  };
  const blend = (top, under) => ({
    r: top.r * top.a + under.r * (1 - top.a),
    g: top.g * top.a + under.g * (1 - top.a),
    b: top.b * top.a + under.b * (1 - top.a),
    a: 1,
  });
  const lum = (c) => {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  const WHITE = { r: 255, g: 255, b: 255, a: 1 };
  const bgOf = (el) => {
    const layers = [];
    for (let n = el; n; n = n.parentElement) {
      const cs = getComputedStyle(n);
      let c = parse(cs.backgroundColor);
      if ((!c || c.a === 0) && cs.backgroundImage && cs.backgroundImage !== "none") c = firstColour(cs.backgroundImage);
      if (c && c.a > 0) {
        layers.push(c);
        if (c.a >= 0.99) break;
      }
    }
    let out = WHITE;
    for (let i = layers.length - 1; i >= 0; i--) out = blend(layers[i], out);
    return out;
  };
  const visible = (el) => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
  };
  const opacityOf = (el) => {
    let o = 1;
    for (let n = el; n && n !== document.body; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
    return o;
  };
  const label = (el) =>
    (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || el.getAttribute("title") || el.tagName)
      .trim().replace(/\s+/g, " ").slice(0, 60);
  // "In a sentence": an inline link with real words beside it in the same
  // parent. Miss that taught this: a button wrapped in a link, under a card's
  // heading, counted as a sentence link because the card had other text.
  const inSentence = (el) => {
    if (getComputedStyle(el).display !== "inline" || !el.parentElement) return false;
    return [...el.parentElement.childNodes].some((n) => n !== el && n.nodeType === 3 && n.textContent.trim().length > 1);
  };

  /** Every page-side check. Returns failure strings. */
  function auditPage(rootSel) {
    const root = document.querySelector(rootSel) || document.body;
    const failures = [];
    const seen = new Set();

    // Text contrast. Miss that taught this: scroll-reveal sections were
    // measured at opacity 0; runners now scroll first and skip opacity < 0.05.
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (!t.textContent.trim()) continue;
      const el = t.parentElement;
      if (!el || seen.has(el) || !visible(el)) continue;
      seen.add(el);
      // Screen-reader-only text (1px, clipped) is never seen. Miss that taught
      // this: every dialog's hidden "Close" label was reported as faint text.
      const box = el.getBoundingClientRect();
      if (box.width <= 2 && box.height <= 2) continue;
      if (el.closest("[aria-hidden='true']") || el.closest("svg") || el.closest("script,style,noscript")) continue;
      const cs = getComputedStyle(el);
      let fg = parse(cs.color);
      if (!fg) continue;
      const opacity = opacityOf(el);
      if (opacity < 0.05) continue;
      const bg = bgOf(el);
      fg = blend({ ...fg, a: fg.a * opacity }, bg);
      const size = parseFloat(cs.fontSize);
      const bold = Number(cs.fontWeight) >= 700;
      const large = size >= 24 || (bold && size >= 18.66);
      const need = large ? 3 : 4.5;
      const r = ratio(fg, bg);
      const disabled = el.closest("button[disabled], [aria-disabled='true'], fieldset[disabled]");
      if (r < need && !disabled) failures.push(`contrast ${r.toFixed(2)} < ${need}: "${label(el)}" (${size}px)`);
    }

    // Placeholders.
    for (const el of root.querySelectorAll("input[placeholder], textarea[placeholder]")) {
      if (!visible(el) || !el.getAttribute("placeholder")) continue;
      const ph = parse(getComputedStyle(el, "::placeholder").color);
      if (!ph) continue;
      const bg = bgOf(el);
      const r = ratio(blend(ph, bg), bg);
      if (r < 4.5) failures.push(`placeholder ${r.toFixed(2)} < 4.5: "${el.getAttribute("placeholder").slice(0, 50)}"`);
    }

    // Placeholders cut off. A one-line field cannot wrap, so a long example
    // loses its end: Week 3's board read "Type a word and press Ente" and "The
    // human need, and the living wa" on a phone and passed every check here
    // (2026-10-14). Measured against the field's text box, 2px of slack for the
    // last glyph's edge. Textareas wrap, so they are not measured.
    const measure = document.createElement("canvas").getContext("2d");
    for (const el of root.querySelectorAll("input[placeholder]")) {
      if (!visible(el) || el.value) continue;
      const text = el.getAttribute("placeholder");
      if (!text) continue;
      const cs = getComputedStyle(el);
      const ph = getComputedStyle(el, "::placeholder");
      measure.font = `${ph.fontStyle} ${ph.fontWeight} ${ph.fontSize} ${ph.fontFamily}`;
      const need = measure.measureText(text).width;
      const room = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      if (need > room + 2) failures.push(`placeholder cut off (${Math.round(need)}px in ${Math.round(room)}px): "${text.slice(0, 50)}"`);
    }

    // Field edges and typed text. Miss that taught typed text: input values
    // are not text nodes, so the contrast walk never saw them.
    for (const el of root.querySelectorAll("input:not([type=checkbox]):not([type=radio]):not([type=hidden]):not([type=range]):not([type=file]), textarea, select")) {
      if (!visible(el) || opacityOf(el) < 0.05) continue;
      const cs = getComputedStyle(el);
      const width = parseFloat(cs.borderBottomWidth);
      const border = parse(cs.borderBottomColor);
      const fill = parse(cs.backgroundColor);
      const around = el.parentElement ? bgOf(el.parentElement) : WHITE;
      const fieldFill = fill && fill.a > 0 ? blend(fill, around) : around;
      const edge = width >= 1 && border ? blend(border, around) : fieldFill;
      const r = Math.max(ratio(edge, around), ratio(fieldFill, around));
      if (r < 3) failures.push(`field edge ${r.toFixed(2)} < 3: "${label(el)}"`);
      if (el.value) {
        const ink = parse(cs.color);
        if (ink) {
          const tr = ratio(blend(ink, fieldFill), fieldFill);
          if (tr < 4.5) failures.push(`typed text ${tr.toFixed(2)} < 4.5: "${label(el)}"`);
        }
      }
    }

    // Touch targets: 44px on touch screens (WCAG 2.5.5), 24px for a mouse
    // (WCAG 2.5.8), the same split the site's Button makes with
    // pointer-coarse:min-h-11. Miss that taught this: 44px everywhere flagged
    // every desktop nav item, burying the real problems.
    const MIN = matchMedia("(pointer: coarse)").matches ? 44 : 24;
    // A <summary> is a control too: the admin export's "Each project's card"
    // disclosures were 16px tall and nothing here looked at them (2026-10-14).
    for (const el of root.querySelectorAll("button, a[href], summary, input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox], [role=button], [role=tab], [role=switch]")) {
      if (!visible(el) || opacityOf(el) < 0.05) continue;
      // The clickable area is the element plus everything inside it: a tap on
      // a child lands on the parent link. Miss that taught this: the site's
      // <Link><Button> pattern measured as a 22px inline strip around a full
      // size button.
      let r = el.getBoundingClientRect();
      for (const child of el.querySelectorAll("*")) {
        const c = child.getBoundingClientRect();
        if (c.width === 0 || c.height === 0) continue;
        const left = Math.min(r.left, c.left), top = Math.min(r.top, c.top);
        const right = Math.max(r.right, c.right), bottom = Math.max(r.bottom, c.bottom);
        r = { left, top, right, bottom, width: right - left, height: bottom - top };
      }
      // Screen-reader-only controls (a skip link that appears on focus).
      if (r.width <= 2 && r.height <= 2) continue;
      if (el.matches("input[type=checkbox], input[type=radio], [role=checkbox], [role=switch], [role=radio]")) {
        // Wrapped in its label, or labelled from beside it in a full-height row.
        const lab = el.closest("label") || (el.id && document.querySelector('label[for="' + el.id + '"]') ? el.parentElement : null);
        if (lab && lab.getBoundingClientRect().height >= MIN) continue;
      }
      // Links inside running text are exempt (WCAG 2.5.8 inline exception).
      if (el.matches("a") && inSentence(el)) continue;
      if (r.height < MIN && r.width < MIN) failures.push(`target ${Math.round(r.width)}x${Math.round(r.height)}: "${label(el)}"`);
      else if (r.height < MIN && !el.matches("textarea")) failures.push(`target height ${Math.round(r.height)}: "${label(el)}"`);
    }

    // Reachable by keyboard (WCAG 2.1.1). A div, span or SVG shape given
    // role=button (or link, checkbox...) takes focus only with a tabindex;
    // without one Tab skips it and Enter or Space never presses it. Items a
    // composite widget parks at tabindex=-1 count as reachable. Miss that
    // taught this: the progress map's landmarks were <g role="button"> with a
    // click handler alone, and the focus walk below only visits what can take
    // focus, so it never saw them (2026-10-20).
    for (const el of root.querySelectorAll("[role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab]")) {
      if (el.matches("a[href], button, input, select, textarea, summary") || el.hasAttribute("tabindex") || el.isContentEditable) continue;
      if (!visible(el) || opacityOf(el) < 0.05 || el.getAttribute("aria-disabled") === "true" || el.closest("[aria-hidden='true'], [inert]")) continue;
      failures.push(`keyboard: ${el.getAttribute("role")} "${label(el)}" has no tabindex, so Tab never reaches it`);
    }

    // Colour only (WCAG 1.4.1), part 1: a link inside a sentence needs a cue
    // besides colour (underline, weight or a bottom border).
    for (const el of root.querySelectorAll("a[href]")) {
      if (!visible(el) || !inSentence(el) || opacityOf(el) < 0.05) continue;
      const cs = getComputedStyle(el);
      const pcs = getComputedStyle(el.parentElement);
      const underlined = cs.textDecorationLine.includes("underline");
      const heavier = Number(cs.fontWeight) - Number(pcs.fontWeight) >= 200;
      const bordered = parseFloat(cs.borderBottomWidth) >= 1 && cs.borderBottomStyle !== "none";
      if (!underlined && !heavier && !bordered) {
        const lc = parse(cs.color);
        const tc = parse(pcs.color);
        const r = lc && tc ? ratio(lc, tc).toFixed(2) : "?";
        failures.push(`colour only: link "${label(el)}" differs from its sentence by colour alone (${r}:1)`);
      }
    }

    // Colour only, part 2: a chosen toggle, tab or chip must differ from its
    // unchosen siblings by more than colour (weight, border, icon, text, mark).
    const STATE = "[aria-pressed], [role=radio][aria-checked], [role=tab][aria-selected], [role=option][aria-selected], [data-state=active], [data-state=on], [aria-current]";
    const signature = (el) => {
      const cs = getComputedStyle(el);
      const content = el.cloneNode(true);
      content.querySelectorAll("*").forEach((n) => { n.removeAttribute("class"); n.removeAttribute("style"); });
      return {
        weight: cs.fontWeight,
        border: `${cs.borderTopWidth} ${cs.borderTopStyle}`,
        deco: cs.textDecorationLine,
        outline: cs.outlineStyle === "none" ? "none" : cs.outlineWidth,
        shadow: cs.boxShadow === "none" ? "none" : "some",
        content: content.innerHTML.replace(/\s+/g, " ").replace(/ (aria|data)-[a-z-]+="[^"]*"/g, ""),
      };
    };
    const isOn = (el) =>
      el.getAttribute("aria-pressed") === "true" ||
      el.getAttribute("aria-checked") === "true" ||
      el.getAttribute("aria-selected") === "true" ||
      el.getAttribute("data-state") === "active" ||
      el.getAttribute("data-state") === "on" ||
      (el.hasAttribute("aria-current") && el.getAttribute("aria-current") !== "false");
    const groups = new Map();
    for (const el of root.querySelectorAll(STATE)) {
      if (!visible(el) || !el.parentElement) continue;
      if (!groups.has(el.parentElement)) groups.set(el.parentElement, []);
      groups.get(el.parentElement).push(el);
    }
    for (const members of groups.values()) {
      const on = members.find(isOn);
      const off = members.find((m) => !isOn(m));
      if (!on || !off || members.length < 2) continue;
      const a = signature(on);
      const b = signature(off);
      const differs = Object.keys(a).some((k) => k !== "content" && a[k] !== b[k]) ||
        a.content.replace(on.textContent, "") !== b.content.replace(off.textContent, "");
      if (!differs) failures.push(`colour only: chosen "${label(on)}" differs from "${label(off)}" by colour alone`);
    }

    // Sideways scroll.
    const over = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    if (over > 1) failures.push(`page scrolls sideways by ${over}px`);

    // A hint under a field that the field doesn't point to (aria-describedby):
    // a screen reader reads the label and never the hint. Miss that taught
    // this: Week 4's seat form said "Ask them first: this board is public"
    // under "Who on your team", and a VoiceOver user typing a teammate's full
    // name never heard it (2026-10-15).
    for (const ctl of root.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea, select")) {
      if (!visible(ctl)) continue;
      const next = ctl.nextElementSibling;
      if (!next || next.tagName !== "P" || !visible(next) || !next.textContent.trim()) continue;
      const ids = (ctl.getAttribute("aria-describedby") || "").split(/\s+/);
      if (!next.id || !ids.includes(next.id)) failures.push(`hint not tied: "${next.textContent.trim().slice(0, 50)}" under "${label(ctl)}" is not in its aria-describedby`);
    }
    // A Save that is disabled while the form holds words: it can't be focused,
    // so Enter and a screen reader get no reason why. Use aria-disabled and say
    // what's missing in a live region. Miss that taught this: Week 4's card
    // forms disabled Save with the reason in a plain paragraph (2026-10-15).
    for (const form of root.querySelectorAll("form")) {
      const save = form.querySelector("button[type=submit][disabled], button:not([type])[disabled]");
      if (!save || !visible(save) || form.getAttribute("aria-busy") === "true") continue;
      const typed = [...form.querySelectorAll("input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea")].some((f) => f.value.trim());
      if (typed) failures.push(`silent save: "${label(save)}" is disabled while the form holds words; use aria-disabled and say what's missing`);
    }

    // Endless animations the compositor cannot run. Each one makes the browser
    // restyle and repaint on the main thread every frame, forever, and every
    // keystroke on the page waits behind that work. Only transform, opacity and
    // filter on an ordinary element run off the main thread; a shape inside an
    // SVG never does. Miss that taught this: the mycelium background pulsed 21
    // SVG shapes on every page, Google Translate's hidden spinner turned
    // forever, and CTA, role-card and badge glows animated background-position
    // and box-shadow, so typing took 50 to 100ms per key on a mid-range phone
    // and nothing here looked at motion (2026-10-14).
    const COMPOSITED = new Set(["opacity", "transform", "translate", "rotate", "scale", "filter", "backdrop-filter", "offset-distance", "offset-rotate"]);
    const animSeen = new Set();
    for (const a of document.getAnimations ? document.getAnimations() : []) {
      const effect = a.effect;
      const target = effect && effect.target;
      if (a.playState !== "running" || !target || !root.contains(target)) continue;
      if (effect.getComputedTiming().endTime !== Infinity) continue;
      const props = new Set();
      for (const kf of effect.getKeyframes()) {
        for (const k of Object.keys(kf)) {
          if (!["offset", "computedOffset", "easing", "composite"].includes(k)) props.add(k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase()));
        }
      }
      const svgShape = target instanceof SVGElement && !(target instanceof SVGSVGElement);
      const slow = [...props].filter((p) => !COMPOSITED.has(p));
      // A blur or drop-shadow filter moves pixels, and Chrome keeps that
      // animation on the main thread too.
      if (effect.getKeyframes().some((kf) => /blur\(|drop-shadow\(/.test(String(kf.filter || "") + String(kf.backdropFilter || "")))) slow.push("a blur or drop-shadow filter");
      if (!svgShape && !slow.length) continue;
      const name = a.animationName || a.transitionProperty || "animation";
      const where = `${target.tagName.toLowerCase()}${target.getAttribute("class") ? "." + target.getAttribute("class").trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
      const why = svgShape ? "a shape inside an SVG" : slow.join(", ");
      const msg = `main thread: endless "${name}" on ${where} animates ${why}; use transform or opacity on an ordinary element`;
      if (animSeen.has(msg)) continue;
      animSeen.add(msg);
      failures.push(msg);
    }
    // SVG's own <animate> (SMIL) never leaves the main thread either, and
    // document.getAnimations() does not list it.
    for (const el of root.querySelectorAll("animate, animateTransform, animateMotion, set")) {
      if (el.getAttribute("repeatCount") !== "indefinite" && el.getAttribute("repeatDur") !== "indefinite") continue;
      const msg = `main thread: endless SVG <${el.tagName}> on ${el.getAttribute("attributeName") || "its path"}; draw it still, or move an ordinary element with a CSS transform`;
      if (animSeen.has(msg)) continue;
      animSeen.add(msg);
      failures.push(msg);
    }
    return failures;
  }

  // ─── Focus ────────────────────────────────────────────────────────────
  const FOCUSABLE = "a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1']), [contenteditable=true]";
  // Only what can be seen: an outline's colour changing while the outline is
  // off is invisible. Miss that taught this: the self-test's no-focus button
  // passed because its hidden outline changed colour.
  const looks = (el) => {
    if (!el) return "";
    const cs = getComputedStyle(el);
    const outlineOn = cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) > 0;
    return [outlineOn ? cs.outlineStyle : "none", outlineOn ? cs.outlineWidth : "0", outlineOn ? cs.outlineColor : "-", cs.boxShadow,
      cs.borderTopColor, cs.borderBottomColor, cs.borderTopWidth, cs.backgroundColor, cs.color, cs.textDecorationLine].join("|");
  };
  // A shape inside an SVG (a <g role="button">, an SVG link) shows focus only
  // in what it draws: Safari paints no outline or box-shadow on it, and Chrome
  // paints the outline around its whole box. So for these only the shapes
  // inside count: one that appears, or whose fill or stroke changes. Miss that
  // taught this: the site's focus ring, an outline plus a box-shadow ring,
  // measured as strong on the progress map's landmarks while Safari drew
  // nothing (2026-10-20).
  const inSvg = (el) => el instanceof SVGElement && !!el.ownerSVGElement;
  const paintOf = (el) => [el, ...el.querySelectorAll("*")].map((n) => {
    let shown = true;
    for (let m = n; m && m !== el.parentElement; m = m.parentElement) {
      if (getComputedStyle(m).display === "none") { shown = false; break; }
    }
    const cs = getComputedStyle(n);
    return [shown && cs.visibility !== "hidden", cs.opacity, cs.fill, cs.fillOpacity, cs.stroke, cs.strokeWidth, cs.strokeOpacity].join("|");
  });
  // An element's focus can show on itself, its parent (focus-within), or the
  // next sibling (peer-focus-visible, as the sr-only TickBox does).
  const trio = (el) => (inSvg(el) ? paintOf(el) : [looks(el), looks(el.parentElement), looks(el.nextElementSibling)]);
  const base = new Map();

  function snapFocusables(rootSel) {
    const root = document.querySelector(rootSel) || document.body;
    if (document.activeElement && document.activeElement !== document.body) document.activeElement.blur();
    let i = 0;
    for (const el of root.querySelectorAll(FOCUSABLE)) {
      el.setAttribute("data-audit-focus", String(i));
      base.set(String(i), trio(el));
      i += 1;
    }
    return i;
  }

  function checkActiveFocus(rootSel) {
    const root = document.querySelector(rootSel) || document.body;
    const el = document.activeElement;
    if (!el || el === document.body || !root.contains(el)) return null;
    const idx = el.getAttribute("data-audit-focus");
    if (idx == null || !base.has(idx)) return { idx: null };
    const before = base.get(idx);
    const now = trio(el);
    const same = now.length === before.length;
    const changed = !same || now.some((s, k) => s !== before[k]);
    if (!changed) return { idx, fail: `focus: no visible focus on "${label(el)}"` };
    if (inSvg(el)) {
      // The strongest paint among the shapes that appeared or changed, against
      // what is behind the drawing.
      const around = bgOf(el.ownerSVGElement);
      let best = null;
      [el, ...el.querySelectorAll("*")].forEach((n, k) => {
        if ((same && now[k] === before[k]) || !now[k].startsWith("true|")) return;
        const cs = getComputedStyle(n);
        const o = opacityOf(n);
        for (const [paint, alpha, width] of [[cs.stroke, cs.strokeOpacity, parseFloat(cs.strokeWidth)], [cs.fill, cs.fillOpacity, 1]]) {
          const c = parse(paint);
          if (!c || !(width > 0)) continue;
          const r = ratio(blend({ ...c, a: c.a * Number(alpha) * o }, around), around);
          best = best == null ? r : Math.max(best, r);
        }
      });
      if (best != null && best < 3) return { idx, fail: `focus: ring ${best.toFixed(2)} < 3 on "${label(el)}"` };
      return { idx };
    }
    // A ring that changed: is it strong enough to see? Outline first, then a
    // box-shadow ring, each against what is around the control.
    const cs = getComputedStyle(el);
    const around = bgOf(el.parentElement || el);
    const [b0] = before;
    // The site's safety net (index.css) draws a dark outline and a light ring
    // together, so one of the two shows on every background: judge the
    // stronger ring, never the weaker.
    const rings = [];
    if (cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 1 && !b0.startsWith(cs.outlineStyle + "|" + cs.outlineWidth)) {
      const c = parse(cs.outlineColor);
      if (c) rings.push(c);
    }
    if (cs.boxShadow !== "none" && !b0.includes(cs.boxShadow)) {
      const c = firstColour(cs.boxShadow);
      if (c) rings.push(c);
    }
    const otherChange = now[0].split("|").slice(4).join("|") !== before[0].split("|").slice(4).join("|") || now[1] !== before[1] || now[2] !== before[2];
    if (rings.length && !otherChange) {
      const best = Math.max(...rings.map((c) => ratio(blend(c, around), around)));
      if (best < 3) return { idx, fail: `focus: ring ${best.toFixed(2)} < 3 on "${label(el)}"` };
    }
    return { idx };
  }

  window.__audit = { auditPage, snapFocusables, checkActiveFocus };
}

/** Walk the page so scroll-reveal sections reveal, then return to the top. */
export async function revealAll(page) {
  await page.evaluate(async () => {
    for (let y = 0; y <= document.documentElement.scrollHeight; y += 300) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

/**
 * Where focus lands after a control that makes itself go away: Cancel on a
 * form, Take back on a card, "Another project" on the check-in question.
 * Focus must land on something, not drop to the page. Each is tapped on a
 * fresh copy of the page (`reset` reloads and replays the story's steps).
 * Miss that taught this: on Week 4's seats stage, Cancel, Take back and
 * "Another project" all left focus on <body>, so a screen reader user lost
 * their place in a long stage (2026-10-15). The progress map's "Close detail"
 * did the same, and inside its focus trap the next Tab then left the map for
 * the page behind it (2026-10-20).
 */
const GOES_AWAY = [/^Cancel$/, /^Take back/, /^Another project$/, /^Close detail$/];

export async function runFocusReturnChecks(page, rootSel, reset) {
  const out = [];
  for (const name of GOES_AWAY) {
    const button = page.locator(rootSel).getByRole("button", { name }).first();
    if (!(await button.count()) || !(await button.isVisible())) continue;
    await button.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(400);
    const where = await page.evaluate((sel) => {
      const a = document.activeElement;
      const root = document.querySelector(sel) || document.body;
      if (!a || a === document.body) return "body";
      return root.contains(a) || !document.querySelector(sel) ? "ok" : "outside";
    }, rootSel);
    if (where !== "ok") out.push(`focus lost: after "${String(name).replace(/[/^$]/g, "")}" focus went to ${where === "body" ? "the page" : "outside the story"}`);
    await reset();
  }
  return out;
}

/** Page-side checks. */
export async function runPageChecks(page, rootSel) {
  await page.evaluate(installAuditLib);
  return page.evaluate((sel) => window.__audit.auditPage(sel), rootSel);
}

/**
 * Keyboard focus: press Tab through the page the way a keyboard user does
 * (:focus-visible only shows for keyboard focus) and check each stop.
 */
export async function runFocusChecks(page, rootSel, maxTabs = 90) {
  await page.evaluate(installAuditLib);
  await page.mouse.move(0, 0);
  const count = await page.evaluate((sel) => window.__audit.snapFocusables(sel), rootSel);
  if (!count) return [];
  // Start just before the area under test: a focusable marker in front of it,
  // focused after one real Tab so the browser is in keyboard mode. Miss that
  // taught this: tabbing from the top of the harness spent the whole budget
  // on its story links and never reached the story.
  await page.keyboard.press("Tab");
  await page.evaluate((sel) => {
    const root = document.querySelector(sel) || document.body;
    const marker = document.createElement("span");
    marker.tabIndex = 0;
    marker.setAttribute("data-audit-marker", "");
    if (root === document.body) document.body.prepend(marker);
    else root.parentElement.insertBefore(marker, root);
    marker.focus();
  }, rootSel);
  const out = [];
  const seen = new Set();
  let outside = 0;
  for (let i = 0; i < Math.min(maxTabs, count + 15); i++) {
    await page.keyboard.press("Tab");
    await page.waitForTimeout(160);
    const r = await page.evaluate((sel) => window.__audit.checkActiveFocus(sel), rootSel);
    if (!r) { if (++outside > 25) break; continue; }
    if (r.idx != null) {
      if (seen.has(r.idx)) break;
      seen.add(r.idx);
    }
    if (r.fail) out.push(r.fail);
  }
  await page.evaluate(() => document.querySelector("[data-audit-marker]")?.remove());
  return out;
}
