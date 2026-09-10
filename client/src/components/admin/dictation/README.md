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
- Mic denied or an unsupported browser shows a short error on the button.
  The page stays up. Type instead.

`useDictation` is the same engine if a surface needs custom chrome. Prefer
`DictationButton` so hold-to-talk and the listening state stay consistent.

## Wired now

- Harvest Compose idea box (`ComposeBox` in `client/src/components/HarvestCompose.tsx`)
- ReGen AI Assistant chat input (`client/src/components/AdminAIAssistant.tsx`)

## Next consumers (second PR, same import)

Do not add a second mic stack. Do not add a Broadcast Voice tab or an Outbound
dictation tab. Import `DictationButton` next to the existing field.

### Broadcast Voice Message field

`client/src/components/AdminBroadcastPanel.tsx`, the Message textarea (`text` /
`setText`, placeholder "What do you want to share?"). Add a `useRef` on that
textarea and place the button beside the label or in the compose row:

```tsx
const messageRef = useRef<HTMLTextAreaElement>(null);

<Label>Message</Label>
<Textarea ref={messageRef} value={text} onChange={(e) => setText(e.target.value)} />
<DictationButton value={text} onChange={setText} targetRef={messageRef} label="Dictate message" />
```

If Broadcast Voice also drafts through the ReGen AI Assistant compose box,
that input already has the mic. Do not grow a parallel assistant.

### Outbound email body / Applications letter composer

`EmailMarkdownComposer` already keeps `textareaRef` on the body. Add the
button on the write-tab toolbar row:

```tsx
<DictationButton value={body} onChange={onBodyChange} targetRef={textareaRef} label="Dictate body" />
```
