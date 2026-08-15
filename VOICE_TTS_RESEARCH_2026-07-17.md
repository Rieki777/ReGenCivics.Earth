# Natural Voices for the Chat Companions — Research + Plan (2026-07-17)

## The problem

The companions (First Mate, Harbormaster, form companion, ReGen Guide) speak through the browser's built-in `speechSynthesis`. That is why they sound like a 2003 chat bot: quality depends entirely on whatever robot voices the visitor's OS ships. The good news: `useVoice.ts` was built with a hosted-voice upgrade path behind `TTS_API_KEY`, so swapping the mouth is config plus one client module, and the field of free, commercially usable models closed the gap with ElevenLabs this year. In blind listening tests, open models now beat ElevenLabs more often than they lose.

## Hear it first

`voice-demos/` (gitignored) has 10 clips I generated with Kokoro-82M, the model that can run 100% in the visitor's browser at $0/month. This is what the site could sound like this week. Female voices speak a First Mate welcome line, male voices a Harbormaster line.

| File | Character |
|---|---|
| kokoro_af_heart.wav | Warm American woman, Kokoro's top-rated voice |
| kokoro_af_bella.wav | Expressive American woman |
| kokoro_af_sarah.wav | Clear, friendly American woman |
| kokoro_af_nicole.wav | Soft, hushed American woman |
| kokoro_bf_emma.wav | Warm British woman |
| kokoro_am_michael.wav | Grounded American man |
| kokoro_am_fenrir.wav | Energetic American man |
| kokoro_am_puck.wav | Bright American man |
| kokoro_bm_george.wav | Steady British man |
| kokoro_bm_fable.wav | Storyteller British man |

## The shortlist (all licensed for commercial use, verified on the model cards)

| Model | License | Size | Voices | Languages | Runs where | Why it matters |
|---|---|---|---|---|---|---|
| **Kokoro-82M** (hexgrad) | Apache 2.0 | 82M | 54 built in (26+ English) | 8 | Browser (kokoro-js, WASM/WebGPU), server CPU, or hosted at $0.62 to $0.80 per 1M chars | The $0 path. Topped TTS Arena. 95M downloads. The demo clips above. |
| **Qwen3-TTS** (Alibaba, Jan 2026) | Apache 2.0 | 0.6B / 1.7B | 9 built in, plus VoiceDesign: describe a voice in plain text and it creates it. Clones from 3s of audio. | 10 incl. EN, ES, FR, DE, PT | Hosted GPU (DeepInfra, Replicate, Alibaba). GGUF exists for CPU. | Best quality per dollar upgrade. Streaming, first audio packet under 100ms. VoiceDesign means each companion persona gets a signature voice written as a text description. |
| **Chatterbox Turbo** (Resemble AI, Dec 2025) | MIT | 0.5B | Voice cloning from short reference clips | EN (23 langs in the main Chatterbox) | Hosted GPU, live on Replicate | Beat ElevenLabs 65.3% to 24.5% in blind listening tests. Only use reference voices you have rights to. |
| **Supertonic-3** (Supertone, May 2026) | OpenRAIL-M (commercial OK, attribution required, no impersonation) | 99M | 10 built in (M1 to M5, F1 to F5) | 31 | On-device ONNX: server CPU at 1,200+ chars/sec, or browser WebGPU | Fastest CPU option by far. The server-side path that would not strain Railway. |
| **VoxCPM2** (OpenBMB, Apr 2026) | Apache 2.0 | 2.3B | Cloning + voice design | 30 | Hosted GPU | Strong multilingual bench if we outgrow the others. |
| **CosyVoice3** (Alibaba FunAudio, Dec 2025) | Apache 2.0 | 0.5B | Cloning | 9 | GPU, streams at ~150ms | Streaming specialist, backup option. |

Ruled out: XTTS-v2 and Fish Audio S2 Pro (non-commercial or custom licenses), Voxtral-TTS (CC-BY-NC), IndexTTS-2 and Higgs TTS 3 (license unclear on the card), OmniVoice (impressive, 600+ languages, license not stated on the model card), VibeVoice (MIT, built for long podcasts, wrong latency profile for chat).

## Recommendation: two phases

### Phase 1 — Kokoro in the browser, $0, ship now

`kokoro-js` (npm, v1.2.1, Apache 2.0) runs Kokoro-82M fully client side via WASM or WebGPU. One ~86MB quantized model download on first use, then cached by the browser and it works offline. Private by design: spoken text never leaves the visitor's device, which fits the movement's values and costs nothing at any scale.

This also deletes a whole class of jank: `shared/voices.ts` currently guesses gender from OS voice names. Kokoro voice IDs encode gender (`af_` = American female, `bm_` = British male), so persona matching becomes a lookup.

Build steps:

1. `pnpm add kokoro-js`.
2. New `client/src/components/companion/kokoroVoice.ts`: lazy singleton that loads the model on first `speak()` (show a one-time "voice warming up" state), exposes `speak(text, voiceId)` returning a stop handle, plus a curated registry of the 10 voices above with display names and gender.
3. `useSpeech` in `useVoice.ts`: try Kokoro, fall back to `speechSynthesis` on load failure or very old devices. Captions already always render, so nothing breaks.
4. `VoicePicker.tsx`: list the curated 10 with a preview button per voice. Keep localStorage prefs; Kokoro IDs are stable across devices, so prefs can later move to the account.
5. Ship gate per `STEERING.md` section 3 before push.

### Phase 2 — hosted signature voices behind TTS_API_KEY (optional upgrade)

When there is budget for noticeably richer prosody: Qwen3-TTS 1.7B on DeepInfra or Replicate. Use VoiceDesign to write each persona a voice ("a warm, weathered woman in her 50s who has spent her life near the sea" for the First Mate) and cache the design. Server adds one rate-limited tRPC procedure `companion.tts` that streams audio; client tries it first when `isTtsConfigured()`, falls back to Kokoro.

Cost reality: a typical companion reply is ~300 characters. At hosted-Kokoro prices that is ~$0.0002 per reply; 100,000 spoken replies a month lands around $19 to $60 even on the bigger models. Nothing like ElevenLabs pricing.

Server-CPU alternative: if browser download weight ever becomes a complaint, Supertonic-3 on Railway serves 10 voices at 1,200+ chars/sec on CPU. OpenRAIL-M requires attribution and forbids impersonation, both fine for us.

## Sources

- [BentoML: open-source TTS in 2026](https://www.bentoml.com/blog/exploring-the-world-of-open-source-text-to-speech-models), [Modal: top open-source TTS](https://modal.com/blog/open-source-tts), [TextToLab: 8 models compared](https://texttolab.com/blog/open-source-text-to-speech)
- [Kokoro-82M model card](https://huggingface.co/hexgrad/Kokoro-82M), [kokoro-js on npm](https://www.npmjs.com/package/kokoro-js), [Kokoro WebGPU benchmarks](https://quick-tts.com/blog/kokoro-webgpu-benchmarks.html)
- [Qwen3-TTS GitHub](https://github.com/QwenLM/Qwen3-TTS), [Qwen3-TTS CustomVoice model card](https://huggingface.co/Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice), [Simon Willison on the release](https://simonwillison.net/2026/Jan/22/qwen3-tts/)
- [Chatterbox Turbo model card](https://huggingface.co/ResembleAI/chatterbox-turbo), [blind test results](https://findskill.ai/blog/best-open-source-tts-2026/)
- [Supertonic-3 site](https://supertonic3.github.io/), [GitHub](https://github.com/supertone-inc/supertonic), [MarkTechPost coverage](https://www.marktechpost.com/2026/05/15/supertone-releases-supertonic-v3-on-device-text-to-speech-model-with-31-language-support-fewer-reading-failures-and-expression-tags/)
- [VoxCPM2 model card](https://huggingface.co/openbmb/VoxCPM2), [DeepInfra TTS pricing](https://deepinfra.com/models/text-to-speech), [Artificial Analysis TTS arena](https://artificialanalysis.ai/text-to-speech/models)
