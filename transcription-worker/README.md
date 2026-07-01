# Transcription worker

A small service that transcribes a YouTube video for the coordination engine. The ReGen Civics server calls it from `server/lib/videoSummary.ts` (`transcribeFallback`) whenever a video has no YouTube captions, which is most of them. Without this worker, caption-less videos get ingested but never understood (no overview, no chapters, no proposed tasks).

## What it does

Takes a video id, pulls the audio with yt-dlp, transcribes it, and returns the transcript plus timestamped segments.

```
POST /
Authorization: Bearer <WORKER_API_KEY>
{ "videoId": "h2K_f-E4hJM", "youtubeUrl": "https://www.youtube.com/watch?v=h2K_f-E4hJM" }

200 OK
{ "text": "full transcript ...", "segments": [ { "start": 0, "text": "..." }, ... ] }
```

`GET /` is a health check that reports the active backend.

## Backends

It picks a backend in this order, first configured one wins (or force it with `TRANSCRIBE_BACKEND`):

1. `GROQ_API_KEY` set, Groq `whisper-large-v3-turbo`. Hosted, fast, roughly $0.04 per hour of audio.
2. `OPENAI_API_KEY` set, OpenAI `whisper-1`. Hosted, roughly $0.36 per hour of audio.
3. Neither set, local `faster-whisper`. Open source, runs on the container CPU, no per-minute cost. Slower and needs a bit of RAM. This is the default and matches the free/local preference. `WHISPER_MODEL` picks the size (`tiny`, `base`, `small`, `medium`, `large-v3`); `base` is the sensible CPU default.

## Deploy on Railway

1. Push this `transcription-worker/` folder to a repo (or point Railway at a subdirectory of the main repo).
2. New Railway service, deploy from the repo. The `Dockerfile` here builds it (it installs ffmpeg, which yt-dlp needs).
3. Set env vars on the worker service:
   - `WORKER_API_KEY` = a long random string. Generate one with `openssl rand -hex 32`.
   - Optionally `GROQ_API_KEY` or `OPENAI_API_KEY` for a hosted backend, else it runs local faster-whisper.
   - Optionally `WHISPER_MODEL` (default `base`).
4. Railway gives the service a public URL, for example `https://transcription-worker-production.up.railway.app`.
5. On the `ReGenCivics.Earth` service, set:
   - `TRANSCRIPTION_WORKER_URL` = that worker URL (the root `/`).
   - `TRANSCRIPTION_API_KEY` = the SAME value as the worker's `WORKER_API_KEY`.
6. Redeploy `ReGenCivics.Earth` so it picks up the two new vars.

If local faster-whisper is too slow or memory-hungry on the Railway plan, add a `GROQ_API_KEY` to the worker and it switches to the hosted backend with no other change.

## Test it

```
curl -s -X POST "$TRANSCRIPTION_WORKER_URL" \
  -H "Authorization: Bearer $WORKER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"videoId":"h2K_f-E4hJM","youtubeUrl":"https://www.youtube.com/watch?v=h2K_f-E4hJM"}' | head -c 400
```

A 200 with a `text` field means it works. A 401 means the token does not match; a 422 means the transcript came back too short.

## Run locally

```
pip install -r requirements.txt
export WORKER_API_KEY=test-key
uvicorn main:app --port 8000
```
