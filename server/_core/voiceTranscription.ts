/**
 * Voice transcription stub  -  the legacy AI speech proxy is no longer available.
 * To re-enable: integrate directly with OpenAI Whisper API or Cloudflare Workers AI.
 */

export type TranscribeOptions = {
  audioUrl: string;
  language?: string;
  prompt?: string;
};

export type TranscriptionError = {
  error: string;
  code: "FILE_TOO_LARGE" | "INVALID_FORMAT" | "TRANSCRIPTION_FAILED" | "UPLOAD_FAILED" | "SERVICE_ERROR";
  details?: string;
};

export type WhisperSegment = {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
};

export type WhisperResponse = {
  task: "transcribe";
  language: string;
  duration: number;
  text: string;
  segments: WhisperSegment[];
};

export type TranscriptionResponse = WhisperResponse;

export async function transcribeAudio(
  _options: TranscribeOptions
): Promise<TranscriptionResponse | TranscriptionError> {
  return {
    error: "Voice transcription is not configured.",
    code: "SERVICE_ERROR",
    details: "Integrate directly with OpenAI Whisper or Cloudflare Workers AI.",
  };
}
