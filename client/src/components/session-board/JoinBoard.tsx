/**
 * "Type in with us": the week's own URL, in full, and a QR of that same URL.
 * On a phone the QR stays folded (they are already here). On a wide screen it
 * is large, and a tap opens it across the whole frame for a projector.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { QR_DARK, QR_LIGHT, QR_QUIET, qrMatrix } from "@shared/boardQr";
import { sessionBoardShareUrl } from "@shared/sessionBoard";

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
  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < matrix.size; y++) {
    for (let x = 0; x < matrix.size; x++) {
      if (matrix.dark(x, y)) cells.push({ x, y });
    }
  }
  const n = matrix.size + QR_QUIET * 2;
  return (
    <svg className={className ?? "sb-qr"} viewBox={`0 0 ${n} ${n}`} role="img" aria-label={`QR code for ${text}`}>
      <rect width={n} height={n} fill={QR_LIGHT} />
      <g fill={QR_DARK}>
        {cells.map((c) => (
          <rect key={`${c.x}-${c.y}`} x={c.x + QR_QUIET} y={c.y + QR_QUIET} width="1" height="1" />
        ))}
      </g>
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
        <BoardQr text={url} className="sb-qr sb-qr-huge" />
        <p className="sb-qr-sheet-url">{label}</p>
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

  return (
    <div className="sb-panel sb-join">
      <h2 className="sb-h3">Type in with us</h2>
      <p className="sb-hint">Open this board on your own screen. Your words, your project and your votes land here live.</p>
      <p className="sb-join-url">{label}</p>
      <div className="sb-join-actions">
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
