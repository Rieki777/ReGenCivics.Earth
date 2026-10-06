/**
 * A quiet card asking for a name and email after someone writes on the board.
 * It stays at the bottom of the stage area and does not take focus.
 */
import { useId, useState, type FormEvent } from "react";
import "./follow-up.css";

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
    <svg className="sb-follow-sprout" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M32 58 V28" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 40 C18 38 12 26 14 16 C26 18 32 30 32 40Z" fill="currentColor" />
      <path d="M32 34 C46 30 54 20 52 10 C40 14 34 26 32 34Z" fill="currentColor" opacity="0.82" />
      <path d="M22 58 H42" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export function FollowUpCapture({
  initialName,
  busy,
  thanks,
  onDismiss,
  onSend,
}: {
  initialName: string;
  busy: boolean;
  thanks: { name: string; email: string } | null;
  onDismiss: (name: string) => void;
  onSend: (name: string, email: string) => Promise<void>;
}) {
  const formId = useId();
  const [name, setName] = useState(initialName);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !name.trim() || !email.trim()) return;
    setError("");
    try {
      await onSend(name.trim(), email.trim());
    } catch (err) {
      setError(sendError(err));
    }
  };

  return (
    <aside className="sb-follow" aria-live="polite" aria-label="Want us to follow up?">
      {thanks ? (
        <div className="sb-follow-thanks" role="status">
          <Sprout />
          <p>Thanks, {thanks.name}. We'll write to {thanks.email}.</p>
        </div>
      ) : (
        <form className="sb-follow-form" onSubmit={(e) => void submit(e)}>
          <p className="sb-follow-title">Want us to follow up?</p>
          <div className="sb-follow-fields">
            <label className="sb-follow-label" htmlFor={`${formId}-name`}>Name</label>
            <input
              id={`${formId}-name`}
              className="sb-follow-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              maxLength={120}
              required
            />
            <label className="sb-follow-label" htmlFor={`${formId}-email`}>Email</label>
            <input
              id={`${formId}-email`}
              className="sb-follow-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              maxLength={320}
              required
            />
          </div>
          {error ? <p className="sb-follow-error" role="alert">{error}</p> : null}
          <div className="sb-follow-actions">
            <button className="sb-follow-send" type="submit" disabled={busy || !name.trim() || !email.trim()}>
              {busy ? "Sending" : "Send"}
            </button>
            <button className="sb-follow-later" type="button" onClick={() => onDismiss(name)}>
              Not now
            </button>
          </div>
        </form>
      )}
    </aside>
  );
}

export { firstName };
