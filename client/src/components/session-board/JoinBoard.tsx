/**
 * "Type in with us": the week's own URL, in full, and a QR of that same URL.
 * On a phone the QR stays folded (they are already here). On a wide screen it
 * is large, and a tap opens it across the whole frame for a projector.
 */
import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { QR_DARK, QR_LIGHT, QR_QUIET, qrDarkPath, qrMatrix } from "@shared/boardQr";
import { sessionBoardShareUrl } from "@shared/sessionBoard";
import { useAskBoardContact } from "./useBoardContact";
import "./follow-up.css";

const JOIN_CALL_URL = "https://regencivics.earth/join";

/** Break a URL only at slashes, so "week" stays one word on a narrow screen. */
function SlashBreaks({ text }: { text: string }): ReactNode {
  const bits = text.split("/");
  return bits.map((bit, i) => (
    <span key={`${i}-${bit}`}>{i > 0 ? <><wbr />/</> : null}{bit}</span>
  ));
}

function useMinWidth(px: number): boolean {
  const query = `(min-width: ${px}px)`;
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setMatches(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return matches;
}

export function BoardQr({ text, className }: { text: string; className?: string }) {
  const matrix = useMemo(() => qrMatrix(text), [text]);
  const path = useMemo(() => qrDarkPath(matrix), [matrix]);
  const n = matrix.size + QR_QUIET * 2;
  const ref = useRef<SVGSVGElement>(null);
  // Snap to a whole number of pixels per module. A fractional size draws
  // gaps between modules, and a scanner reads those gaps as white.
  useLayoutEffect(() => {
    const el = ref.current;
    const parent = el?.parentElement;
    if (!el || !parent) return;
    const fit = () => {
      el.style.width = "";
      el.style.height = "";
      const cssWidth = el.getBoundingClientRect().width;
      if (cssWidth < n) return;
      const scale = Math.max(1, Math.floor(cssWidth / n));
      const px = String(scale * n);
      el.style.width = `${px}px`;
      el.style.height = `${px}px`;
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(parent);
    return () => ro.disconnect();
  }, [n]);
  return (
    <svg ref={ref} className={className ?? "sb-qr"} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <rect width={n} height={n} fill={QR_LIGHT} />
      <path d={path} fill={QR_DARK} />
    </svg>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="sb-btn sb-small"
      aria-live="polite"
      onClick={() => {
        navigator.clipboard?.writeText(text).then(
          () => {
            setDone(true);
            window.setTimeout(() => setDone(false), 1800);
          },
          () => {},
        );
      }}
    >
      {done ? "Copied" : "Copy link"}
    </button>
  );
}

function QrPresenter({ url, label, onClose }: { url: string; label: string; onClose: () => void }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const previously = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previously?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="sb-qr-presenter" role="presentation" onClick={onClose}>
      <div
        className="sb-qr-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id={titleId} className="sb-qr-sheet-title">Type in with us</h2>
        <div className="sb-qr-sheet-fit">
          <BoardQr text={url} className="sb-qr sb-qr-huge" />
        </div>
        <p className="sb-qr-sheet-url"><SlashBreaks text={label} /></p>
        <button ref={closeRef} type="button" className="sb-btn" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

export function JoinBoard({ week }: { week: number }) {
  const url = sessionBoardShareUrl(week);
  const label = url.replace(/^https:\/\//, "");
  const wide = useMinWidth(900);
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const contact = useAskBoardContact();

  return (
    <div className="sb-panel sb-join">
      <h2 className="sb-h3">Type in with us</h2>
      <p className="sb-hint">Open this board on your own screen. Your words, your project and your votes land here live.</p>
      {contact?.showLink ? (
        <button type="button" className="sb-follow-optin" onClick={contact.ask}>Leave your name and email</button>
      ) : null}
      <p className="sb-join-url"><SlashBreaks text={label} /></p>
      <div className="sb-join-actions">
        <a className="sb-btn" href={JOIN_CALL_URL}>Join the call</a>
        <CopyButton text={url} />
        {canShare ? (
          <button
            type="button"
            className="sb-btn sb-small"
            onClick={() => {
              void navigator.share({ url, title: `Season 2, week ${week}` }).catch(() => {});
            }}
          >
            Share
          </button>
        ) : null}
      </div>
      {wide ? (
        <button type="button" className="sb-qr-btn" onClick={() => setOpen(true)} aria-label={`Show the QR code for ${label} full screen`}>
          <BoardQr text={url} />
          <span>Tap to fill the screen</span>
        </button>
      ) : (
        <details className="sb-qr-details">
          <summary>Show the QR code</summary>
          <BoardQr text={url} />
        </details>
      )}
      {open ? <QrPresenter url={url} label={label} onClose={close} /> : null}
    </div>
  );
}
