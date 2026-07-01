"""
ReGen Civics transcription worker.

Matches the contract that server/lib/videoSummary.ts `transcribeFallback` expects:

  POST /
  Authorization: Bearer <TRANSCRIPTION_API_KEY>
  body: { "videoId": "...", "youtubeUrl": "https://www.youtube.com/watch?v=..." }
  ->  200 { "text": "...", "segments": [{ "start": <int seconds>, "text": "..." }] }

Any non-200, or a body without a usable "text", makes the caller fall back to
"no transcript" and skip understanding that video. So failures here are safe:
the pipeline degrades, it does not break.

Backend selection (first that is configured wins):
  1. GROQ_API_KEY   -> Groq whisper-large-v3-turbo  (hosted, fast, cheap)
  2. OPENAI_API_KEY -> OpenAI whisper-1             (hosted)
  3. otherwise      -> local faster-whisper         (open source, no per-min cost)

Set TRANSCRIBE_BACKEND=local|groq|openai to force one explicitly.
"""

import os
import re
import tempfile
import subprocess
from pathlib import Path

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel

WORKER_API_KEY = os.environ.get("WORKER_API_KEY", "")
WHISPER_MODEL = os.environ.get("WHISPER_MODEL", "base")  # tiny|base|small|medium|large-v3
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "")
BACKEND = os.environ.get("TRANSCRIBE_BACKEND", "").lower().strip()

VIDEO_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")

app = FastAPI(title="ReGen Civics transcription worker")


class TranscribeRequest(BaseModel):
    videoId: str | None = None
    youtubeUrl: str | None = None


def resolve_backend() -> str:
    if BACKEND in ("local", "groq", "openai"):
        return BACKEND
    if GROQ_API_KEY:
        return "groq"
    if OPENAI_API_KEY:
        return "openai"
    return "local"


def download_audio(video_id: str, dest_dir: str) -> str:
    """Pull the audio track with yt-dlp. Returns the path to the mp3.

    YouTube blocks datacenter IPs hard, so we try a few extractor clients that
    tend to survive the block, and surface yt-dlp's real stderr on failure.
    """
    out_tmpl = os.path.join(dest_dir, "audio.%(ext)s")
    url = f"https://www.youtube.com/watch?v={video_id}"
    cookies = os.environ.get("YTDLP_COOKIES_FILE")
    # Player clients to try in order. Some survive datacenter-IP blocking when
    # the default web client is refused with "Sign in to confirm you're not a bot".
    client_args = os.environ.get(
        "YTDLP_PLAYER_CLIENTS", "default,android,ios,web_safari,tv"
    )

    def build_cmd() -> list[str]:
        cmd = [
            "yt-dlp",
            "-x",
            "--audio-format", "mp3",
            "--audio-quality", "5",
            "--no-playlist",
            "--extractor-args", f"youtube:player_client={client_args}",
            "-o", out_tmpl,
            url,
        ]
        if cookies and Path(cookies).exists():
            cmd[1:1] = ["--cookies", cookies]
        return cmd

    result = subprocess.run(build_cmd(), capture_output=True, text=True, timeout=600)
    mp3 = os.path.join(dest_dir, "audio.mp3")
    if result.returncode != 0 or not Path(mp3).exists():
        tail = (result.stderr or result.stdout or "").strip()[-800:]
        raise RuntimeError(f"yt-dlp failed (exit {result.returncode}): {tail}")
    return mp3


def transcribe_local(path: str) -> dict:
    from faster_whisper import WhisperModel

    model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segments_iter, _info = model.transcribe(path, vad_filter=True)
    segments = []
    parts = []
    for s in segments_iter:
        txt = (s.text or "").strip()
        if not txt:
            continue
        segments.append({"start": max(0, int(s.start or 0)), "text": txt})
        parts.append(txt)
    return {"text": " ".join(parts).strip(), "segments": segments}


def transcribe_hosted(path: str, base_url: str, api_key: str, model: str) -> dict:
    """OpenAI-compatible audio/transcriptions endpoint (Groq and OpenAI both are)."""
    import requests

    with open(path, "rb") as f:
        resp = requests.post(
            f"{base_url}/audio/transcriptions",
            headers={"Authorization": f"Bearer {api_key}"},
            files={"file": ("audio.mp3", f, "audio/mpeg")},
            data={"model": model, "response_format": "verbose_json"},
            timeout=600,
        )
    resp.raise_for_status()
    data = resp.json()
    segments = []
    for s in data.get("segments", []) or []:
        txt = str(s.get("text", "")).strip()
        if not txt:
            continue
        segments.append({"start": max(0, int(s.get("start", 0) or 0)), "text": txt})
    return {"text": str(data.get("text", "")).strip(), "segments": segments}


@app.get("/")
def health() -> dict:
    return {"ok": True, "backend": resolve_backend(), "model": WHISPER_MODEL}


@app.post("/")
def transcribe(req: TranscribeRequest, authorization: str = Header(default="")) -> dict:
    if not WORKER_API_KEY:
        raise HTTPException(status_code=500, detail="WORKER_API_KEY not configured")
    if authorization != f"Bearer {WORKER_API_KEY}":
        raise HTTPException(status_code=401, detail="bad token")

    video_id = (req.videoId or "").strip()
    if not video_id and req.youtubeUrl:
        m = re.search(r"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})", req.youtubeUrl)
        video_id = m.group(1) if m else ""
    if not VIDEO_ID_RE.match(video_id):
        raise HTTPException(status_code=400, detail="missing or malformed videoId")

    backend = resolve_backend()
    with tempfile.TemporaryDirectory() as tmp:
        try:
            audio = download_audio(video_id, tmp)
        except Exception as e:  # surface the real yt-dlp reason to the caller + logs
            raise HTTPException(status_code=502, detail=str(e))
        if backend == "groq":
            result = transcribe_hosted(
                audio, "https://api.groq.com/openai/v1", GROQ_API_KEY, "whisper-large-v3-turbo"
            )
        elif backend == "openai":
            result = transcribe_hosted(
                audio, "https://api.openai.com/v1", OPENAI_API_KEY, "whisper-1"
            )
        else:
            result = transcribe_local(audio)

    if not result.get("text") or len(result["text"]) < 50:
        raise HTTPException(status_code=422, detail="transcript too short or empty")
    return result
