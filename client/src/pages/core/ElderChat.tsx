import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Ask an Elder. Reusable across elders: pass the elder id and display name.
 *
 * Renders the live retrieval-grounded chat when the server reports the elder is
 * ready (ANTHROPIC_API_KEY set and their corpus built); otherwise it keeps a
 * calm coming-soon placeholder. The elder answers in their own voice, grounded
 * in their canon, and a crisis message steps out of persona. The elders do not
 * name their sources (a single quiet acknowledgment lives on Transparency).
 */
type Props = {
  elderId: string;
  /** Display name, e.g. "AI Elder Anastasia". */
  name: string;
  /** Short name used in copy, e.g. "Anastasia". */
  shortName: string;
  placeholder: string;
};

type ChatMsg = { role: "user" | "assistant"; content: string };

const DISCLAIMER =
  "This is an AI presence of the church, sharing an elder's wisdom in conversation. It is not live counsel from a person.";

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function ElderChat({ elderId, name, shortName, placeholder }: Props) {
  const enabledQuery = trpc.elderChat.elderChatEnabled.useQuery({ elder: elderId }, { staleTime: 5 * 60 * 1000 });
  const [sessionId] = useState(newSessionId);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [value, setValue] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const ask = trpc.elderChat.ask.useMutation({
    onSuccess: (res) => setMessages((m) => [...m, { role: "assistant", content: res.answer }]),
    onError: (err) => setError(err.message || `${shortName} is quiet just now. Please try again.`),
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, ask.isPending]);

  const live = enabledQuery.data?.enabled === true;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    if (!live) {
      setNote(`Thank you. ${shortName}'s living presence is being prepared. Soon you will be able to sit here and ask what your heart is holding.`);
      setValue("");
      return;
    }
    if (ask.isPending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setValue("");
    ask.mutate({ sessionId, question: q, elder: elderId });
  }

  return (
    <div className="chatbox" style={{ maxWidth: 760, margin: "0 auto", borderStyle: live ? "solid" : undefined }}>
      {!live && <span className="coming">Coming soon</span>}
      <h3>Sit with {shortName}</h3>
      <p style={{ fontSize: ".95rem", color: "var(--forest-moss)" }}>
        Ask what your heart is holding. {shortName} answers from a lifetime of wisdom, simply and directly.
      </p>

      {live && messages.length > 0 && (
        <div className="chat-log" ref={logRef} aria-live="polite" aria-label={`Conversation with ${shortName}`}>
          {messages.map((m, i) => (
            <div key={i} className={`chat-msg ${m.role}`}><p>{m.content}</p></div>
          ))}
          {ask.isPending && <div className="chat-msg assistant"><p>{shortName} is listening...</p></div>}
        </div>
      )}

      <form onSubmit={submit}>
        <label htmlFor={`ask-${elderId}`} className="subhead" style={{ display: "block", marginBottom: 8, color: "var(--forest-moss)" }}>
          What would you ask {shortName}?
        </label>
        <div className="chat-input">
          <input
            id={`ask-${elderId}`}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={ask.isPending}
          />
          <button className="btn btn-primary" type="submit" disabled={ask.isPending}>Ask</button>
        </div>
        {note && <p className="chat-note">{note}</p>}
        {error && <p className="chat-note" role="alert" style={{ color: "var(--coral)" }}>{error}</p>}
      </form>

      <p style={{ marginTop: 16, fontSize: ".82rem", color: "var(--forest-sage)" }}>{DISCLAIMER}</p>
    </div>
  );
}
