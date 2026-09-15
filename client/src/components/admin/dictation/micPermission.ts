/**
 * Microphone permission helpers for admin dictation.
 *
 * Chromium will not show Allow again after the user clicks Block. Detect that
 * denied state via the Permissions API, and use getUserMedia to surface the
 * prompt while the state is still "prompt".
 */
export type MicPermission = "granted" | "denied" | "prompt" | "unknown";

function isPermissionState(value: string): value is Exclude<MicPermission, "unknown"> {
  return value === "granted" || value === "denied" || value === "prompt";
}

export async function queryMicrophonePermission(): Promise<MicPermission> {
  if (typeof navigator === "undefined" || !navigator.permissions?.query) return "unknown";
  try {
    const status = await navigator.permissions.query({ name: "microphone" as PermissionName });
    return isPermissionState(status.state) ? status.state : "unknown";
  } catch {
    // Firefox historically threw TypeError for name: "microphone".
    return "unknown";
  }
}

function isDeniedCaptureError(err: unknown): boolean {
  if (!err || typeof err !== "object" || !("name" in err)) return false;
  const name = String(err.name);
  return name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError";
}

/**
 * Ask the browser for mic access so Chromium can show Allow, then release
 * the stream. SpeechRecognition can start afterward. Returns denied when the
 * user (or a Permissions-Policy header) has blocked capture.
 */
export async function requestMicrophoneAccess(): Promise<MicPermission> {
  const getUserMedia = navigator.mediaDevices?.getUserMedia;
  if (typeof navigator === "undefined" || typeof getUserMedia !== "function") return "unknown";
  try {
    const stream = await getUserMedia.call(navigator.mediaDevices, { audio: true });
    for (const track of stream.getTracks()) {
      try { track.stop(); } catch { /* already ended */ }
    }
    return "granted";
  } catch (err) {
    if (isDeniedCaptureError(err)) return "denied";
    return "unknown";
  }
}
