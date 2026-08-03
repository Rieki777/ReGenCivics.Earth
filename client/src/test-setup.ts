import '@testing-library/jest-dom';
import { vi, beforeEach } from 'vitest';

/**
 * Give the suite the one secret it needs, the way CI already does.
 *
 * `ENV.cookieSecret` is `process.env.JWT_SECRET`, and anything that signs a
 * token with it (harvest-email's confirm token, the OAuth state HMAC) throws
 * `crypto.createHmac` "key must be of type string ... Received undefined" when
 * it is unset. Vitest deliberately loads no `.env` — it must not, or the
 * DB-backed suites would key their skipIfNoDb guard on the LIVE DATABASE_URL
 * and run against production. So CI passes JWT_SECRET on the step and local
 * runs got nothing, which left `pnpm test` red on every dev machine while CI
 * was green. Four failures in harvest-email.test.ts became background noise
 * that shipped-log entries learned to explain away, which is exactly how a
 * real failure gets waved through.
 *
 * Set it here, not in the shell, so local and CI agree without anyone having
 * to remember an env var. Never overwrite a value the environment supplied.
 */
process.env.JWT_SECRET ??= 'test-jwt-secret';

// Only stub browser layout methods when running in a DOM environment.
// This file is loaded as a global setupFile for both jsdom (client tests) and
// Node (server tests); Element does not exist in the Node environment.
if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView = vi.fn();
}

/**
 * Give jsdom tests a real Web Storage implementation.
 *
 * Node 22 defines its own `localStorage` global, and it wins over the one jsdom
 * installs — but ours arrives as a bare `{}` with no getItem/setItem at all
 * (hence the `--localstorage-file was provided without a valid path` warning on
 * every run). Code that touches storage inside a try/catch — which is the normal
 * way to write it, since Safari private mode throws — therefore swallowed a
 * TypeError and silently no-opped. Any test asserting on storage passed
 * vacuously. That is the dangerous kind of broken: green, and testing nothing.
 *
 * So: replace it with a working in-memory Storage, reset between tests for
 * isolation. Tests that want to simulate a storage failure should stub the
 * method they care about rather than relying on the environment being broken.
 */
if (typeof window !== 'undefined') {
  const makeStorage = (): Storage => {
    let store = new Map<string, string>();
    return {
      getItem: (key: string) => (store.has(String(key)) ? store.get(String(key))! : null),
      setItem: (key: string, value: string) => void store.set(String(key), String(value)),
      removeItem: (key: string) => void store.delete(String(key)),
      clear: () => store.clear(),
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  };

  for (const name of ['localStorage', 'sessionStorage'] as const) {
    Object.defineProperty(globalThis, name, {
      configurable: true,
      writable: true,
      value: makeStorage(),
    });
    // jsdom's window is the same object as globalThis here, but define it on
    // window too so `window.localStorage` is correct if that ever diverges.
    if (window !== (globalThis as unknown as Window)) {
      Object.defineProperty(window, name, {
        configurable: true,
        writable: true,
        value: (globalThis as unknown as Record<string, Storage>)[name],
      });
    }
  }

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
}
