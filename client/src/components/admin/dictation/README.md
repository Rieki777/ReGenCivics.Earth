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
Interim speech is written into the field while Listening is on, so a send
button can enable before the browser marks the phrase final. A pause keeps
that text and the next phrase continues after it.

## Behavior

- Click toggles listening. The button fills forest green, pulses, and shows
  "Listening" while the mic is open.
- Hold the mic to talk, release to stop.
- Password, `autocomplete=current-password` / `new-password`, and
  `data-dictation="off"` fields are skipped. Focus into a password field
  stops listening.
- Mic denied: the button opens a forest-green panel — “Microphone permission
  is blocked for this site.” Steps cover the browser site-info / mic control
  and OS mic privacy when needed. Primary CTA is **I allowed it — try again**
  (rechecks permission via `dictation.start()` without a full reload); Reload
  is a fallback. Chromium will not show the Allow prompt again after Block.
  Type in the meantime.
- Unsupported browser: a short error on the button. The page stays up.
- Recognition starts in the click, before the permission check resolves, so
  Chrome still has the gesture. A `start()` that throws, or a recognizer that
  ends immediately with no transcript, turns Listening off and leaves the
  field unchanged. Prompt or an unknown Permissions API, and only when that
  start failed: Chromium gets `getUserMedia({ audio: true })` so Allow can
  appear, then Web Speech tries once more. Already-granted mics skip that
  second capture so it cannot take the microphone away from recognition.

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
