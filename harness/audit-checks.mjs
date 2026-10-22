/**
 * The readability checks behind `pnpm ui:audit` (harness stories) and
 * `pnpm ui:audit:live` (the running app). One implementation, two runners.
 * The improvement loop that grows this file is in CLAUDE.md, "UI readability
 * gate". Each check's comment says what it guards and, where it came from a
 * miss, what slipped through first.
 *
 * Page checks also measure every open popover, list, menu or dialog that
 * portals out of a story into <body>.
 *
 * Checks:
 *   contrast      text against the real background it sits on (WCAG 1.4.3)
 *   placeholder   placeholder text, 4.5:1
 *   cut off       text a box that hides overflow cuts at its edge or below a
 *                 fixed height, with no ellipsis or clamp to say so
 *   typed text    what people type, against the field's fill
 *   field edge    text fields' outline or fill (or the row line a bare search
 *                 box sits on), 3:1 (WCAG 1.4.11)
 *   target        44px touch targets, 24px for a mouse, list and menu rows
 *                 included; links inside a sentence exempt
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
  const CLEAR = { r: 0, g: 0, b: 0, a: 0 };

  // Commas outside brackets: "linear-gradient(...), radial-gradient(...)".
  const splitTop = (s) => {
    const out = [];
    let depth = 0;
    let from = 0;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === "(") depth += 1;
      else if (s[i] === ")") depth -= 1;
      else if (s[i] === "," && depth === 0) {
        out.push(s.slice(from, i).trim());
        from = i + 1;
      }
    }
    out.push(s.slice(from).trim());
    return out.filter(Boolean);
  };
  const STOP_RE = new RegExp(`^(?:${COLOUR_RE.source})`);
  // Text that is only emoji: pictographs shown as emoji by default or by
  // U+FE0F, with their joiners, skin tones and flag tags. A lone ★ or © is
  // text and keeps being measured.
  const EMOJI_ONLY = /^(?:\s|\p{Emoji_Presentation}|\p{Extended_Pictographic}\uFE0F|[\u200D\uFE0F\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}])+$/u;
  const px = (v, size) => (v.endsWith("%") ? (parseFloat(v) / 100) * size : parseFloat(v));
  const PLACE = { left: "0%", top: "0%", center: "50%", right: "100%", bottom: "100%" };
  /**
   * The colour a linear or radial gradient paints at (x, y) in its box, so
   * words are measured against the part of the gradient they sit on. The
   * browser mixes the two stops either side (color-mix, in the gradient's own
   * space: Tailwind's are oklab). A url() image is unknown (null); a conic
   * gradient gives its first colour.
   */
  const gradientAt = (img, box, x, y) => {
    const m = img.match(/^(repeating-)?(linear|radial)-gradient\((.*)\)$/s);
    if (!m) return img.startsWith("url(") ? null : firstColour(img);
    const args = splitTop(m[3]);
    const head = args.length && !STOP_RE.test(args[0]) ? args.shift() : "";
    const space = (head.match(/\bin ([a-z-]+(?: [a-z]+ hue)?)/) || [null, "srgb"])[1];
    const shape = head.replace(/\bin [a-z-]+(?: [a-z]+ hue)?/, "");
    const { width: w, height: h } = box;
    const [bx, by] = [x - box.left, y - box.top];
    let ray; // the gradient's length in px
    let t; // where the point falls along it, 0 to 1
    if (m[2] === "linear") {
      let [dx, dy] = [0, 1];
      const turn = shape.match(/(-?[\d.]+)(deg|grad|rad|turn)/);
      const to = shape.match(/\bto ((?:top|bottom|left|right)(?: (?:top|bottom|left|right))?)/);
      if (turn) {
        const a = (parseFloat(turn[1]) * { deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 }[turn[2]] * Math.PI) / 180;
        [dx, dy] = [Math.sin(a), -Math.cos(a)];
      } else if (to) {
        const sx = /right/.test(to[1]) ? 1 : /left/.test(to[1]) ? -1 : 0;
        const sy = /bottom/.test(to[1]) ? 1 : /top/.test(to[1]) ? -1 : 0;
        // Toward a corner, the line runs square to the other diagonal.
        [dx, dy] = sx && sy ? [sx * h, sy * w] : [sx, sy];
        const n = Math.hypot(dx, dy);
        [dx, dy] = [dx / n, dy / n];
      }
      ray = Math.abs(w * dx) + Math.abs(h * dy);
      t = ((bx - w / 2) * dx + (by - h / 2) * dy) / ray + 0.5;
    } else {
      const at = shape.match(/\bat (\S+)(?: (\S+))?/);
      let [ax, ay] = at ? [at[1], at[2] || "center"] : ["center", "center"];
      if (/^(top|bottom)$/.test(ax) || /^(left|right)$/.test(ay)) [ax, ay] = [ay, ax];
      const [cx, cy] = [px(PLACE[ax] || ax, w), px(PLACE[ay] || ay, h)];
      const size = shape.replace(/\bat .*/, "");
      const lengths = size.match(/-?[\d.]+(?:px|%)/g) || [];
      const circle = /\bcircle\b/.test(size) || lengths.length === 1;
      let rx;
      let ry;
      if (lengths.length) {
        rx = px(lengths[0], w);
        ry = circle ? rx : px(lengths[1], h);
      } else {
        // closest-side, farthest-side, closest-corner, or farthest-corner (the default)
        const near = /closest/.test(size);
        const corner = !/side/.test(size);
        const fx = near ? Math.min(cx, w - cx) : Math.max(cx, w - cx);
        const fy = near ? Math.min(cy, h - cy) : Math.max(cy, h - cy);
        if (circle) rx = ry = corner ? Math.hypot(fx, fy) : near ? Math.min(fx, fy) : Math.max(fx, fy);
        else [rx, ry] = corner ? [fx * Math.SQRT2, fy * Math.SQRT2] : [fx, fy];
      }
      ray = rx;
      t = ry > 0 ? Math.hypot((bx - cx) / rx, (by - cy) / ry) : Infinity;
    }
    if (!(ray > 0)) return firstColour(img);
    // Stops: a colour and up to two places. A bare place is a midpoint hint,
    // read here as halfway.
    const stops = [];
    for (const arg of args) {
      const c = arg.match(STOP_RE);
      if (!c) continue;
      const places = arg.slice(c[0].length).trim().split(/\s+/).filter(Boolean);
      for (const p of places.length ? places : [null]) stops.push({ c: c[0], at: p === null ? null : px(p, ray) / ray });
    }
    if (!stops.length) return null;
    // Places never step back, and unplaced stops share the room between their neighbours.
    stops[0].at ??= 0;
    stops[stops.length - 1].at ??= 1;
    let floor = -Infinity;
    for (const s of stops) if (s.at !== null) floor = s.at = Math.max(s.at, floor);
    for (let i = 1; i < stops.length; i++) {
      if (stops[i].at !== null) continue;
      let j = i;
      while (stops[j].at === null) j += 1;
      for (let k = i; k < j; k++) stops[k].at = stops[i - 1].at + ((stops[j].at - stops[i - 1].at) * (k - i + 1)) / (j - i + 1);
    }
    const [first, last] = [stops[0].at, stops[stops.length - 1].at];
    if (m[1] && last > first) t = first + ((((t - first) % (last - first)) + (last - first)) % (last - first));
    if (!(t > first)) return parse(stops[0].c) || CLEAR;
    for (let i = 1; i < stops.length; i++) {
      const [a, b] = [stops[i - 1], stops[i]];
      if (t > b.at) continue;
      const f = b.at > a.at ? (t - a.at) / (b.at - a.at) : 1;
      return parse(`color-mix(in ${space}, ${a.c} ${((1 - f) * 100).toFixed(3)}%, ${b.c})`) || CLEAR;
    }
    return parse(stops[stops.length - 1].c) || CLEAR;
  };

  const zOf = (cs) => parseInt(cs.zIndex, 10) || 0;
  /**
   * The siblings of n that paint under it and cover the whole text box: an
   * absolutely placed backdrop, a crossfading sky. Topmost first. Only the
   * sibling itself counts, never its children, so a drifting particle never
   * lands under a word by chance.
   */
  const layersUnder = (n, box) => {
    const p = n.parentElement;
    if (!p) return [];
    const kids = [...p.children];
    const at = kids.indexOf(n);
    const zn = zOf(getComputedStyle(n));
    const out = [];
    kids.forEach((s, i) => {
      if (i === at) return;
      const cs = getComputedStyle(s);
      if ((cs.position !== "absolute" && cs.position !== "fixed") || cs.display === "none" || cs.visibility === "hidden") return;
      const z = zOf(cs);
      if (i < at ? z > zn : z >= zn) return; // painted over n
      const r = s.getBoundingClientRect();
      if (r.left > box.left + 1 || r.top > box.top + 1 || r.right < box.right - 1 || r.bottom < box.bottom - 1) return;
      out.push({ s, z, i, opacity: Number(cs.opacity) });
    });
    return out.sort((a, b) => b.z - a.z || b.i - a.i);
  };

  /**
   * What is painted behind el, at its centre: each ancestor's background and
   * the layers laid under each one, down to the first opaque paint, with
   * gradients read where el sits on them. Miss that taught this: the season
   * wheel's skies sit beside its words, not around them, and a gradient
   * counted as its first colour, so the wheel's story measured white on white
   * (33 false findings) and /seasons measured the FALL label against the
   * page's darkest green instead of the lighter sky under it (2026-10-20).
   */
  const bgOf = (el) => {
    const box = el.getBoundingClientRect();
    const [x, y] = [box.left + box.width / 2, box.top + box.height / 2];
    const layers = [];
    // Pushes what n paints at the point, topmost first; true once opaque.
    const paint = (n, opacity) => {
      const cs = getComputedStyle(n);
      if (cs.backgroundClip === "text") return false; // gradient words, not a backdrop
      const own = cs.backgroundImage && cs.backgroundImage !== "none"
        ? splitTop(cs.backgroundImage).map((img) => gradientAt(img, n.getBoundingClientRect(), x, y))
        : [];
      own.push(parse(cs.backgroundColor));
      for (const c of own) {
        if (!c || c.a * opacity <= 0) continue;
        layers.push({ ...c, a: c.a * opacity });
        if (c.a * opacity >= 0.99) return true;
      }
      return false;
    };
    walk: for (let n = el; n; n = n.parentElement) {
      if (paint(n, 1)) break;
      for (const l of layersUnder(n, box)) if (paint(l.s, l.opacity)) break walk;
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

  // Layers that portal into <body>: popovers, menus and Select lists (Radix
  // popper wrappers and item-aligned Select lists) and dialogs.
  const PORTALED = "[data-radix-popper-content-wrapper], [role=listbox], [role=menu], [role=dialog], [role=alertdialog]";

  /**
   * Every page-side check, on the root and on each open layer portaled out of
   * it. Returns failure strings. Miss that taught this (2026-10-21): an open
   * popover renders into <body>, outside a story's root, so no story ever
   * measured one; the bioregion picker's list hid a 1.8:1 Suggest button and
   * 2:1 realm notes on its highlighted row.
   */
  function auditPage(rootSel) {
    const root = document.querySelector(rootSel) || document.body;
    const layers = [...document.querySelectorAll(PORTALED)].filter((el) => !root.contains(el) && visible(el));
    const outermost = layers.filter((el) => !layers.some((other) => other !== el && other.contains(el)));
    return [root, ...outermost].flatMap(auditRoot);
  }

  function auditRoot(root) {
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
      // Emoji paint in their own colours, so their CSS colour says nothing.
      // Miss that taught this: once gradients were read where words sit, the
      // 🌕 on /team's moon bar measured 1.00:1 against the bar's pale middle.
      const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join("");
      if (EMOJI_ONLY.test(own)) continue;
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

    // Text cut off by a box that hides overflow: words pushed past the edge
    // of a box with overflow hidden, or lines below a fixed height, with
    // nothing to say there is more. Miss that taught this (2026-10-21): on
    // phones .tap-44 made the bioregion picker's rows inline-flex, so their
    // realm notes ran past the popover's edge and were cut mid-word; every
    // check passed and only a phone screenshot showed it. Fine: a box that
    // draws its own ellipsis or line clamp, text the reader can scroll to,
    // text wholly outside the box (a closed panel), a carousel's next slide.
    // A line's box is taller than its glyphs, so a line counts as cut only
    // when over a third of it is outside.
    const SLACK = 2;
    const clipInfo = new Map();
    const clipOf = (a) => {
      let s = clipInfo.get(a);
      if (s) return s;
      const cs = getComputedStyle(a);
      s = {
        x: cs.overflowX,
        y: cs.overflowY,
        pos: cs.position,
        contents: cs.display === "contents",
        contained: cs.transform !== "none" || cs.filter !== "none" || /paint|layout|strict|content/.test(cs.contain || ""),
        ellipsis: cs.textOverflow === "ellipsis",
        clamp: [cs.getPropertyValue("-webkit-line-clamp"), cs.getPropertyValue("line-clamp")].some((v) => v && v !== "none"),
        hidden: (cs.clip && cs.clip !== "auto") || (cs.clipPath && cs.clipPath !== "none"),
        slide: a.getAttribute("aria-roledescription") === "slide",
      };
      clipInfo.set(a, s);
      return s;
    };
    const cutOf = (el, lines) => {
      // An absolute box escapes the static boxes between it and its
      // containing block; a fixed one escapes all but transformed ones.
      let escape = null;
      let inSlide = false;
      for (let a = el; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
        const s = clipOf(a);
        if (s.contents) continue;
        if (a !== el && escape) {
          if (escape === "fixed" ? !s.contained : s.pos === "static" && !s.contained) continue;
          escape = null;
        }
        const clipX = s.x === "hidden" || s.x === "clip", clipY = s.y === "hidden" || s.y === "clip";
        const scrollX = s.x === "auto" || s.x === "scroll", scrollY = s.y === "auto" || s.y === "scroll";
        if (clipX || clipY || scrollX || scrollY) {
          if (s.hidden) return null;
          if (inSlide && (clipX || clipY)) return null;
          const b = a.getBoundingClientRect();
          const L = b.left + a.clientLeft, T = b.top + a.clientTop, R = L + a.clientWidth, B = T + a.clientHeight;
          if (clipX || clipY) {
            const shown = lines.filter((r) => (!clipX || Math.min(r.right, R) > Math.max(r.left, L)) && (!clipY || Math.min(r.bottom, B) > Math.max(r.top, T)));
            if (!shown.length) return null;
            if (clipX && !s.ellipsis) {
              const over = Math.max(...lines.map((r) => r.right - R)), under = Math.max(...lines.map((r) => L - r.left));
              if (over > SLACK) return { a, edge: `${Math.round(over)}px past the right edge` };
              if (under > SLACK) return { a, edge: `${Math.round(under)}px past the left edge` };
            }
            if (clipY && !s.clamp) {
              for (const r of lines) {
                const out = Math.max(0, r.bottom - B) + Math.max(0, T - r.top);
                if (out > 0.35 * r.height) {
                  return { a, edge: r.bottom > B ? `${Math.round(r.bottom - B)}px below the bottom edge` : `${Math.round(T - r.top)}px above the top edge` };
                }
              }
            }
          }
          // From here up the reader sees only the part inside this box: past
          // a box that scrolls, or draws its own ellipsis or clamp, the words
          // are reachable or marked as cut on purpose.
          const keepX = scrollX || (clipX && s.ellipsis), keepY = scrollY || (clipY && s.clamp);
          if (keepX || keepY) {
            lines = lines
              .map((r) => ({
                left: keepX ? Math.max(r.left, L) : r.left,
                right: keepX ? Math.min(r.right, R) : r.right,
                top: keepY ? Math.max(r.top, T) : r.top,
                bottom: keepY ? Math.min(r.bottom, B) : r.bottom,
                height: r.height,
              }))
              .filter((r) => r.right > r.left && r.bottom > r.top);
            if (!lines.length) return null;
          }
        }
        if (s.slide) inSlide = true;
        if (s.pos === "fixed") escape = "fixed";
        else if (s.pos === "absolute") escape = "absolute";
      }
      return null;
    };
    const cutSeen = new Set();
    const clipWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let t = clipWalker.nextNode(); t; t = clipWalker.nextNode()) {
      const text = t.textContent.trim();
      if (!text) continue;
      const el = t.parentElement;
      if (!el || cutSeen.has(el) || !visible(el) || opacityOf(el) < 0.05) continue;
      if (el.closest("[aria-hidden='true'], svg, script, style, noscript")) continue;
      const box = el.getBoundingClientRect();
      if (box.width <= 2 && box.height <= 2) continue;
      const range = document.createRange();
      range.selectNodeContents(t);
      const lines = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
      if (!lines.length) continue;
      const cut = cutOf(el, lines);
      if (!cut) continue;
      cutSeen.add(el);
      const cls = cut.a.getAttribute("class");
      const where = `${cut.a.tagName.toLowerCase()}${cls ? "." + cls.trim().split(/\s+/).slice(0, 2).join(".") : ""}`;
      failures.push(`text cut off (${cut.edge} of ${where}): "${text.replace(/\s+/g, " ").slice(0, 60)}"`);
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
      let r = Math.max(ratio(edge, around), ratio(fieldFill, around));
      // A box with no edge or fill of its own, drawn by the row it sits in (a
      // search box over a list: cmdk's input, the bioregion pickers): the
      // row's bottom line is its edge, and it still needs 3:1 (2026-10-21).
      if (r < 3 && !(width >= 1) && !(fill && fill.a > 0) && el.parentElement) {
        const row = getComputedStyle(el.parentElement);
        const line = parse(row.borderBottomColor);
        if (parseFloat(row.borderBottomWidth) >= 1 && line) {
          const outside = el.parentElement.parentElement ? bgOf(el.parentElement.parentElement) : WHITE;
          r = Math.max(r, ratio(blend(line, outside), outside));
        }
      }
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
    // So is a row in a list or menu: the bioregion picker's rows were 32px on
    // phones and nothing measured an option (2026-10-21).
    for (const el of root.querySelectorAll("button, a[href], summary, input:not([type=hidden]), select, textarea, [role=radio], [role=checkbox], [role=button], [role=tab], [role=switch], [role=option], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio]")) {
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

    // Words pressed against the inside of their own bordered box: a panel lost
    // its padding. Miss that taught this: Week 4's "Every week's board" card
    // reused a class another list had already given `padding: 0`, so its text
    // sat on the panel's border, and every other check passed (2026-10-21).
    for (const box of root.querySelectorAll("div, section, article, aside, li, ul, ol, form, fieldset")) {
      const cs = getComputedStyle(box);
      const bl = parseFloat(cs.borderLeftWidth);
      if (bl < 1 || cs.borderLeftStyle === "none" || parseFloat(cs.paddingLeft) >= 4 || !visible(box)) continue;
      const edge = parse(cs.borderLeftColor);
      if (!edge || edge.a < 0.1 || parseFloat(cs.borderTopWidth) < 1) continue;
      const left = box.getBoundingClientRect().left + bl;
      const tw = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
      for (let t = tw.nextNode(); t; t = tw.nextNode()) {
        if (!t.textContent.trim() || !t.parentElement || !visible(t.parentElement)) continue;
        if (t.parentElement.closest("[aria-hidden='true']")) continue;
        // A control inside the box carries its own padding: its words are judged against its own edge.
        const ctl = t.parentElement.closest("button, a, input, select, textarea, label");
        if (ctl && ctl !== box && box.contains(ctl)) continue;
        const range = document.createRange();
        range.selectNodeContents(t);
        const r = range.getBoundingClientRect();
        if (r.width > 0 && r.left - left < 3) {
          failures.push(`text on its border: "${t.textContent.trim().slice(0, 40)}" touches the inside edge of its box (padding ${cs.paddingLeft})`);
          break;
        }
      }
    }
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
  // Let fades still running finish, so text is measured as it rests. Endless
  // animations are left alone (the main-thread check reads those). Miss that
  // taught this: /fund's hero waits on its background images, then fades its
  // buttons in after 600ms; under load the audit read them mid-fade at 2.15:1
  // and then 4.02:1, on buttons that rest at 6.3:1 (2026-10-21).
  await page.evaluate(async () => {
    const finite = (document.getAnimations ? document.getAnimations() : []).filter((a) => {
      const end = a.effect?.getComputedTiming?.().endTime;
      return typeof end === "number" && Number.isFinite(end);
    });
    await Promise.race([
      Promise.all(finite.map((a) => a.finished.catch(() => {}))),
      new Promise((r) => setTimeout(r, 3000)),
    ]);
  });
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
 * the page behind it (2026-10-20). The bioregion picker's Clear became a real
 * button (2026-10-21) and goes away with the value it clears.
 */
const GOES_AWAY = [/^Cancel$/, /^Take back/, /^Another project$/, /^Close detail$/, /^Clear bioregion$/];

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
