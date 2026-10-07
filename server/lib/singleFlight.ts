/** One in-process job at a time. A second call while the first is running does not start another. */
export function createSingleFlight(run: () => Promise<unknown>): () => { started: boolean } {
  let inflight: Promise<unknown> | null = null;
  return () => {
    if (inflight) return { started: false };
    inflight = Promise.resolve(run()).finally(() => {
      inflight = null;
    });
    return { started: true };
  };
}
