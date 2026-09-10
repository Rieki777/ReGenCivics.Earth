# Admin dictation

Shared mic for long admin text fields. Browser Web Speech API (Chrome and
Safari). No paid speech-to-text in this module.

## Drop-in

```tsx
import { DictationButton } from "@/components/admin/dictation";

const ref = useRef<HTMLTextAreaElement>(null);
const [text, setText] = useState("");

<Textarea ref={ref} value={text} onChange={(e) => setText(e.target.value)} />
<DictationButton value={text} onChange={setText} targetRef={ref} />
```

That is the whole integration. `onChange` receives the next full string. The
hook inserts at the caret (or appends) and never replaces the whole field.

## Behavior

- Click toggles listening. The button fills forest green, pulses, and shows
  "Listening" while the mic is open.
- Hold the mic to talk, release to stop.
- Password, `autocomplete=current-password` / `new-password`, and
  `data-dictation="off"` fields are skipped. Focus into a password field
  stops listening.
- Mic denied: the button opens a forest-green panel with steps (address-bar
  lock or site info icon → Microphone → Allow → reload). Chromium will not
  show the Allow prompt again after Block. Type in the meantime.
- Unsupported browser: a short error on the button. The page stays up.
- Prompt, granted, or a browser without the Permissions API: the normal
  request path runs. Chromium gets `getUserMedia({ audio: true })` first so
  Allow can appear, then the stream is released and Web Speech starts.

`useDictation` is the same engine if a surface needs custom chrome. Prefer
`DictationButton` so hold-to-talk and the listening state stay consistent.

## Wired now

- Harvest Compose idea box (`ComposeBox` in `client/src/components/HarvestCompose.tsx`)
- ReGen AI Assistant chat input (`client/src/components/AdminAIAssistant.tsx`)
- Broadcast Message field (`AdminBroadcastPanel` in `client/src/components/AdminBroadcastPanel.tsx`)
- Write with me chat input (`EmailDraftAgent` in `client/src/components/admin/EmailDraftAgent.tsx`), used by Outbound Write and Applications status email

If Broadcast also drafts through the ReGen AI Assistant compose box, that input
already has the mic. Do not grow a parallel assistant.

## Next consumers (same import)

Do not add a second mic stack. Do not add an Outbound dictation tab. Import
`DictationButton` next to the existing field.

### Outbound email body / Applications letter composer

`EmailMarkdownComposer` already keeps `textareaRef` on the body. Add the
button on the write-tab toolbar row:

```tsx
<DictationButton value={body} onChange={onBodyChange} targetRef={textareaRef} label="Dictate body" />
```
