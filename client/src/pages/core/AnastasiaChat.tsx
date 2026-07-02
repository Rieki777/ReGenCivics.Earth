import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

/**
 * Ask Anastasia.
 *
 * Renders the live retrieval-grounded chat when the server reports the feature
 * is ready (ANTHROPIC_API_KEY set and the corpus built); otherwise it keeps the
 * coming-soon placeholder. Answers are grounded in The Ringing Cedars canon,
 * cite book and section, and a crisis message steps out of persona. Attribution
 * to Vladimir Megre stays visible in every state.
 */

type ChatMsg = {
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ book: string; section: string }>;
  isCrisis?: boolean;
};

const DISCLAIMER =
  "This is an AI drawing on The Ringing Cedars of Russia by Vladimir Megre. It shares Anastasia's teachings from the canon, not live counsel from a person.";

function newSessionId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  } catch {
    /* fall through */
  }
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ComingSoon() {
  const [note, setNote] = useState<string | null>(null);
  const [value, setValue] = useState("");
  return (
    <div className="chatbox" style={{ maxWidth: 760, margin: "0 auto" }}>
      <span className="coming">Coming soon</span>
      <h3>Sit with Anastasia</h3>
      <p>
        We are preparing a way for you to ask Anastasia your questions directly, in conversation,
        drawing on her full canon. In time, each of our elders will have a living presence here, so
        their wisdom is always within reach of anyone who seeks it.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setNote("Thank you. The living canon of the elders is being prepared. Soon you will be able to sit with Anastasia here and ask what your heart is holding.");
          setValue("");
        }}
      >
        <label htmlFor="ask" className="subhead" style={{ display: "block", marginBottom: 8, color: "var(--forest-moss)" }}>
          What would you ask her?
        </label>
        <div className="chat-input">
          <input id="ask" type="text" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Ask Anastasia about the land, the Space of Love, the path ahead..." />
          <button className="btn btn-primary" type="submit">Ask</button>
        </div>
        {note && <p className="chat-note">{note}</p>}
      </form>
      <p style={{ marginTop: 16, fontSize: ".9rem", color: "var(--forest-sage)" }}>
        Anastasia's words are drawn from <em>The Ringing Cedars of Russia</em> by Vladimir Megre. We
        honor him as the recorder of this canon.
      </p>
    </div>
  );
}

export default function AnastasiaChat() {
  const enabledQuery = trpc.elderChat.elderChatEnabled.useQuery(undefined, { staleTime: 5 * 60 * 1000 });
  const [sessionId] = useState(newSessionId);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const ask = trpc.elderChat.ask.useMutation({
    onSuccess: (res) => {
      setMessages((m) => [...m, { role: "assistant", content: res.answer, citations: res.citations, isCrisis: res.isCrisis }]);
    },
    onError: (err) => setError(err.message || "Anastasia is quiet just now. Please try again."),
  });

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages, ask.isPending]);

  // While we don't yet know, keep the calm placeholder rather than flashing UI.
  if (enabledQuery.isLoading || enabledQuery.data?.enabled !== true) {
    return <ComingSoon />;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q || ask.isPending) return;
    setError(null);
    setMessages((m) => [...m, { role: "user", content: q }]);
    setValue("");
    ask.mutate({ sessionId, question: q });
  }

  return (
    <div className="chatbox" style={{ maxWidth: 760, margin: "0 auto", borderStyle: "solid" }}>
      <h3>Sit with Anastasia</h3>
      <p style={{ fontSize: ".95rem", color: "var(--forest-moss)" }}>
        Ask what your heart is holding. She answers from her canon and points you to the book and
        section, so you can sit with the passage yourself.
      </p>

      <div className="chat-log" ref={logRef} aria-live="polite" aria-label="Conversation with Anastasia">
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.role}`}>
            <p>{m.content}</p>
            {m.role === "assistant" && m.citations && m.citations.length > 0 && (
              <span className="chat-cite">
                From: {m.citations.map((c) => `${c.book}${c.section ? ` / ${c.section}` : ""}`).join("; ")}
              </span>
            )}
          </div>
        ))}
        {ask.isPending && (
          <div className="chat-msg assistant"><p>Anastasia is listening...</p></div>
        )}
      </div>

      <form onSubmit={submit}>
        <label htmlFor="ask" className="subhead" style={{ display: "block", marginBottom: 8, color: "var(--forest-moss)" }}>
          What would you ask her?
        </label>
        <div className="chat-input">
          <input id="ask" type="text" value={value} onChange={(e) => setValue(e.target.value)}
            placeholder="Ask Anastasia about the land, the Space of Love, the path ahead..." disabled={ask.isPending} />
          <button className="btn btn-primary" type="submit" disabled={ask.isPending}>Ask</button>
        </div>
        {error && <p className="chat-note" role="alert" style={{ color: "var(--coral)" }}>{error}</p>}
      </form>

      <p style={{ marginTop: 16, fontSize: ".82rem", color: "var(--forest-sage)" }}>{DISCLAIMER}</p>
    </div>
  );
}
