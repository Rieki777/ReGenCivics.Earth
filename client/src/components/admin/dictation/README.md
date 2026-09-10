# Admin dictation

Shared mic for long admin text fields. Uses the browser Web Speech API (Chrome
and Safari). No paid speech-to-text.

```tsx
const ref = useRef<HTMLTextAreaElement>(null);
const [text, setText] = useState("");

<Textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} />
<DictationButton value={text} onChange={setText} targetRef={ref} />
```

Click toggles listening. Hold the mic to talk, release to stop. Transcript
inserts at the caret (appends if the field has no selection). Password and
other credential fields are skipped.

`useDictation` is the same engine if a surface needs custom chrome.

Wired today: Harvest Compose idea box, admin AI chatbot. Broadcast Voice and
Outbound email compose should import this control rather than adding another mic.
