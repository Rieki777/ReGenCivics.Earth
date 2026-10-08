/**
 * In-process cap for one coordination pass.
 * Outside a pass the count stays 0. The 24h database count still applies.
 */
let runActive = false;
let batchesThisRun = 0;

export function beginRecordingMailRun(): void {
  runActive = true;
  batchesThisRun = 0;
}

export function endRecordingMailRun(): void {
  runActive = false;
  batchesThisRun = 0;
}

export function recordingMailBatchesThisRun(): number {
  return runActive ? batchesThisRun : 0;
}

export function noteRecordingMailBatch(): void {
  if (!runActive) return;
  batchesThisRun += 1;
}
