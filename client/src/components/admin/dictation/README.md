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
- The recognizer runs one phrase at a time (`continuous: false`) and starts
  again on each pause. Chrome's continuous mode can end in a few milliseconds
  with no error and no words, and a restart loop then leaves Listening on
  over an empty field.
- If that instant end happens twice, or Listening stays up for about 8 seconds
  with no words, the mic stops and the button shows "No words came through.
  Check the microphone, or type instead."

## When the Ask field stays empty

The mic writes into whichever field it was given (`value` / `onChange` /
`targetRef`). On the admin assistant that is the Ask textarea. An empty field
with the green ring means the recognizer never delivered a transcript.

Checks, in order:

1. The page is HTTPS (or localhost). Web Speech does not run in an insecure
   context, and the button should say the browser cannot listen.
2. The browser is Chrome. The button uses `SpeechRecognition` /
   `webkitSpeechRecognition` only.
3. The address-bar site control has Microphone set to Allow. Block opens the
   Allow steps modal.
4. The OS lets Chrome use the microphone, and Chrome's site microphone
   setting points at a real input, not a silent virtual device.
5. After this fix, a recognizer that starts and never returns words leaves
   Listening and shows the "No words came through" error. That message means
   the browser accepted `start()` and then sent no transcript.
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
