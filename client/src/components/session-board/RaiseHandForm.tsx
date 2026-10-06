/**
 * Name and email for one raised hand on "A Game we build together".
 * The form stays available after the board closes. While the board is open,
 * sending also raises the hand.
 */
import { useEffect, useId, useMemo, useState, type FormEvent } from "react";
import type { BoardOfferKey } from "@shared/sessionBoard";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { readBoardContact, readBoardName, saveBoardContact } from "./boardContactStore";
import { sessionVoterKey } from "./useSessionBoard";
import "./raise-hand.css";

type Who = { names: string[]; guests: number };

function firstName(full: string): string {
  const part = full.trim().split(/\s+/)[0];
  return part || full.trim();
}

function sendError(err: unknown): string {
  const msg = (err as { message?: string })?.message;
  if (msg && !/^\[|fetch|network/i.test(msg)) return msg;
  return "That didn't send. Check your connection and try again.";
}

function Sprout() {
  return (
    <svg className="sb-hand-sprout" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 58 V28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 40 C18 38 12 26 14 16 C26 18 32 30 32 40Z" fill="currentColor" />
      <path d="M32 34 C46 30 54 20 52 10 C40 14 34 26 32 34Z" fill="currentColor" opacity="0.82" />
      <path d="M22 58 H42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function RaiseHand({
  week,
  offerKey,
  label,
  pressedLabel,
  count,
  raised,
  boardOpen,
  facilitator,
  who,
  onLower,
  onHanded,
}: {
  week: number;
  offerKey: BoardOfferKey;
  label: string;
  pressedLabel: string;
  count: number;
  raised: boolean;
  boardOpen: boolean;
  facilitator: boolean;
  who?: Who;
  onLower: () => void;
  onHanded: () => void;
}) {
  const formId = useId();
  const voterKey = useMemo(sessionVoterKey, []);
  const { user, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [seeded, setSeeded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [thanks, setThanks] = useState<{ name: string; email: string } | null>(null);
  const signUp = trpc.sessionBoard.signUp.useMutation();

  useEffect(() => {
    if (seeded || loading) return;
    const stored = readBoardContact();
    const storedEmail = stored && "email" in stored ? stored.email : "";
    const accountName = typeof user?.name === "string" ? user.name.trim() : "";
    const accountEmail = typeof user?.email === "string" ? user.email.trim() : "";
    const nextName = accountName || readBoardName();
    const nextEmail = accountEmail || storedEmail;
    if (nextName) setName((current) => current || nextName.slice(0, 120));
    if (nextEmail) setEmail((current) => current || nextEmail.slice(0, 320));
    setSeeded(true);
  }, [user, seeded, loading]);

  const canLower = boardOpen && raised;
  const hands = `${count} ${count === 1 ? "hand" : "hands"}`;

  const openForm = () => {
    setError("");
    setOpen(true);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !name.trim() || !email.trim()) return;
    setBusy(true);
    setError("");
    try {
      const result = await signUp.mutateAsync({
        week,
        voterKey,
        offer: offerKey,
        fullName: name.trim(),
        email: email.trim(),
        note: note.trim() || undefined,
      });
      if (result.handed) onHanded();
      saveBoardContact({ name: name.trim(), email: email.trim() });
      setThanks({ name: firstName(name), email: email.trim() });
      setOpen(false);
    } catch (err) {
      setError(sendError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <strong>{label}</strong>
      <span className="sb-h-n">{hands}</span>
      {canLower ? (
        <button type="button" className="sb-toggle" aria-pressed="true" onClick={onLower}>
          {pressedLabel}
          <span className="sr-only"> to {label.toLowerCase()}</span>
        </button>
      ) : thanks ? null : (
        <button
          type="button"
          className="sb-toggle"
          aria-pressed="false"
          aria-expanded={open}
          onClick={() => (open ? setOpen(false) : openForm())}
        >
          Raise a hand
          <span className="sr-only"> to {label.toLowerCase()}</span>
        </button>
      )}
      {who && (who.names.length || who.guests) ? (
        <details className="sb-tg-who sb-hand-who">
          <summary>Who raised a hand (only facilitators see this)</summary>
          <p>
            {who.names.length ? <>Signed in: {who.names.join(", ")}.</> : null}
            {who.names.length && who.guests ? " " : null}
            {who.guests ? <>{who.guests} {who.guests === 1 ? "guest" : "guests"} without an account.</> : null}
          </p>
          {facilitator ? <p>Sign-ups are in Admin, under Inquiries, Season board hands.</p> : null}
        </details>
      ) : facilitator ? (
        <p className="sb-hint sb-hand">Sign-ups are in Admin, under Inquiries, Season board hands.</p>
      ) : null}
      {thanks ? (
        <div className="sb-hand sb-hand-thanks" role="status">
          <Sprout />
          <p>Thank you, {thanks.name}. We'll write to {thanks.email}.</p>
        </div>
      ) : null}
      {open && !thanks ? (
        <form className="sb-hand sb-hand-form" onSubmit={(e) => void submit(e)}>
          <label className="sb-hand-label" htmlFor={`${formId}-name`}>Name</label>
          <input
            id={`${formId}-name`}
            className="sb-hand-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            maxLength={120}
            required
          />
          <label className="sb-hand-label" htmlFor={`${formId}-email`}>Email</label>
          <input
            id={`${formId}-email`}
            className="sb-hand-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            inputMode="email"
            maxLength={320}
            required
          />
          <label className="sb-hand-label" htmlFor={`${formId}-note`}>
            Anything we should know? <span className="sb-hand-opt">(optional)</span>
          </label>
          <input
            id={`${formId}-note`}
            className="sb-hand-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            autoComplete="off"
          />
          {error ? <p className="sb-hand-error" role="alert">{error}</p> : null}
          <div className="sb-hand-actions">
            <button className="sb-hand-send" type="submit" disabled={busy || !name.trim() || !email.trim()}>
              {busy ? "Sending" : "Send"}
            </button>
            <button className="sb-hand-close" type="button" onClick={() => setOpen(false)}>
              Close
            </button>
          </div>
        </form>
      ) : null}
    </>
  );
}
