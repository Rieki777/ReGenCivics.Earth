import { useEffect, useState } from "react";

// Module-level cache so we only fetch once per page load
let cachedToken: string | null = null;
let fetchPromise: Promise<string> | null = null;

async function fetchCsrfToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/csrf-token", { credentials: "include" })
    .then((res) => res.json())
    .then((data: { csrfToken: string }) => {
      cachedToken = data.csrfToken;
      fetchPromise = null;
      return cachedToken!;
    })
    .catch(() => {
      fetchPromise = null;
      return "";
    });

  return fetchPromise;
}

export function useCsrfToken(): string | null {
  const [token, setToken] = useState<string | null>(cachedToken);

  useEffect(() => {
    if (cachedToken) {
      setToken(cachedToken);
      return;
    }
    fetchCsrfToken().then((t) => setToken(t || null));
  }, []);

  return token;
}

/**
 * Returns the cached CSRF token synchronously (may be null before first fetch).
 * Used by the tRPC client to inject the header on mutations.
 */
export function getCsrfToken(): string | null {
  return cachedToken;
}

/**
 * Ensures the CSRF token has been fetched and cached.
 * Call this early (e.g. in main.tsx) to prime the cache.
 */
export function initCsrfToken(): Promise<string> {
  return fetchCsrfToken();
}
