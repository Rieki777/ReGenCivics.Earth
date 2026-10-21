/**
 * A transaction run again when the database rolled it back to end a deadlock.
 *
 * InnoDB ends a deadlock by rolling back one transaction in it, the one that
 * has written and locked the least, and tells its caller to start it again
 * (ER_LOCK_DEADLOCK, errno 1213). Nothing of that attempt is left, so running
 * the whole transaction again is safe as long as it does every read and check
 * it relies on inside the transaction. MariaDB (the local scratch database)
 * reports the same kind of rollback as ER_CHECKREAD when a row the
 * transaction locks changed after its first read.
 *
 * A lock wait timeout is not tried again: the caller has already waited
 * innodb_lock_wait_timeout (50 seconds by default) by then.
 */

const DEADLOCK_CODES = new Set(["ER_LOCK_DEADLOCK", "ER_CHECKREAD"]);

/**
 * True when the error says the transaction was rolled back to end a deadlock.
 * drizzle wraps the driver's error (a DrizzleQueryError with the mysql2 error
 * as its cause) and tRPC can wrap that again, so the causes are followed.
 */
export function isDeadlock(error: unknown): boolean {
  let e: any = error;
  for (let depth = 0; e != null && depth < 5; depth++) {
    if (DEADLOCK_CODES.has(e.code)) return true;
    e = e.cause;
  }
  return false;
}

/**
 * Runs `run`, a whole transaction, and runs it again after a short pause when
 * the database rolled it back to end a deadlock: `attempts` runs at most. Any
 * other error, and the last deadlock, goes to the caller.
 */
export async function withDeadlockRetry<T>(
  label: string,
  run: () => Promise<T>,
  { attempts = 3, pauseMs = 50 }: { attempts?: number; pauseMs?: number } = {},
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (e) {
      if (attempt >= attempts || !isDeadlock(e)) throw e;
      console.warn(`[db] ${label}: rolled back to end a deadlock, running it again (${attempt + 1} of ${attempts})`);
      // Part of the pause is random, so two transactions that deadlocked each
      // other don't start again in step.
      await new Promise((r) => setTimeout(r, pauseMs * attempt + Math.random() * pauseMs));
    }
  }
}
