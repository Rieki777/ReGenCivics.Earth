// ── Stale-chunk reload ──────────────────────────────────────────────────────
// After a deploy, users with cached HTML try to load JS chunks that no longer
// exist. Vite fires "vite:preloadError" for lazy-loaded routes. We catch it
// and do a single hard reload so the browser fetches the fresh HTML + chunks.
window.addEventListener("vite:preloadError", (e: Event) => {
  const key = "vite-chunk-reload";
  if (!sessionStorage.getItem(key)) {
    sessionStorage.setItem(key, "1");
    window.location.reload();
  }
  e.preventDefault();           // suppress the uncaught error in Sentry
});
// Clear the flag on successful page loads so future deploys also auto-reload
window.addEventListener("load", () => sessionStorage.removeItem("vite-chunk-reload"), { once: true });

// Sentry is deferred until after page load, it's non-essential for rendering
if (import.meta.env.VITE_SENTRY_DSN) {
  window.addEventListener("load", () => {
    import("@sentry/react").then((Sentry) => {
      Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        tracesSampleRate: 0.1,
        integrations: [Sentry.browserTracingIntegration()],
      });
    });
  }, { once: true });
}
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import { getLoginUrl } from "./const";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { GoogleTranslateProvider } from "@/components/GoogleTranslate";
import "./index.css";
import { getCsrfToken } from "@/hooks/useCsrfToken";


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 60s, prevents redundant refetches on tab switch / navigation
      staleTime: 60_000,
      // Keep unused query data in cache for 5 minutes
      gcTime: 5 * 60_000,
      // Don't retry on 4xx errors (auth failures, not-found), only on network errors
      retry: (failureCount, error: unknown) => {
        if (error instanceof Error && error.message.includes("UNAUTHORIZED")) return false;
        if (error instanceof Error && error.message.includes("FORBIDDEN")) return false;
        if (error instanceof Error && error.message.includes("NOT_FOUND")) return false;
        return failureCount < 2;
      },
    },
    mutations: {
      onError: (error: any) => {
        if (error?.data?.code === 'TOO_MANY_REQUESTS' || error?.message?.includes('maximum number of submissions')) {
          // Extract time remaining from error message if possible
          const match = error?.message?.match(/(\d+) minute/);
          const minutes = match ? match[1] : 'a few';
          toast.error(`The garden needs a moment to breathe. Try again in about ${minutes} minute${minutes !== '1' ? 's' : ''}.`, {
            duration: 8000,
            icon: '🌱',
          });
        }
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;

  const isUnauthorized = error.message === UNAUTHED_ERR_MSG;

  if (!isUnauthorized) return;

  // Save current path so we can return after login. We pass it to the server
  // as a `returnTo` query param (primary) and also stash it in sessionStorage
  // (fallback). iPhone Safari's ITP can clear sessionStorage across the OAuth
  // hop, so the server-side state param is the reliable path home.
  const currentPath = window.location.pathname + window.location.search;
  const hasReturn =
    currentPath && currentPath !== "/" && !currentPath.startsWith("/login");
  if (hasReturn) {
    sessionStorage.setItem("returnTo", currentPath);
  }

  window.location.href = getLoginUrl(hasReturn ? currentPath : undefined);
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      fetch(input, init) {
        const csrfToken = getCsrfToken();
        const headers = new Headers(init?.headers as HeadersInit | undefined);
        if (csrfToken) {
          headers.set("x-csrf-token", csrfToken);
        }
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
          headers,
        });
      },
    }),
  ],
});

// Error recovery for installed PWA users: if React fails to mount,
// clear caches and reload so they don't get stuck on a broken screen.
try {
  createRoot(document.getElementById("root")!).render(
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>
        <GoogleTranslateProvider>
          <LanguageProvider>
            <App />
          </LanguageProvider>
        </GoogleTranslateProvider>
      </QueryClientProvider>
    </trpc.Provider>
  );
// ── Service Worker lifecycle ────────────────────────────────────────────────
// Force reload when a new SW activates so users always get fresh assets.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload();
  });

  // Proactive update checks: 30s after load, then every 10 minutes.
  // Without this, the browser only checks on navigation or every ~24h,
  // so deployed fixes can take a full day to reach open tabs.
  navigator.serviceWorker.ready.then((registration) => {
    setTimeout(() => registration.update().catch(() => {}), 30_000);
    setInterval(() => registration.update().catch(() => {}), 10 * 60_000);
  });

  // Nuke stale runtime caches from the old SW config (renamed in v2).
  // These one-shot deletes run once per user then become no-ops.
  if ('caches' in window) {
    caches.delete('images');   // replaced by images-v2 (StaleWhileRevalidate)
  }
}

} catch (err) {
  const root = document.getElementById("root");
  if (root) {
    root.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;background:#0d2818;color:#e0e0e0;font-family:system-ui,sans-serif;text-align:center;padding:2rem;">
        <div>
          <h1 style="font-size:1.25rem;margin-bottom:0.5rem;">Something went wrong</h1>
          <p style="opacity:0.7;">Clearing cache and reloading...</p>
        </div>
      </div>
    `;
  }
  // Unregister service workers AND clear all caches to break out of stale SW loop
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.getRegistrations().then((regs) =>
      Promise.all(regs.map((r) => r.unregister()))
    );
  }
  if ("caches" in window) {
    caches.keys().then((names) => Promise.all(names.map((n) => caches.delete(n))));
  }
  setTimeout(() => window.location.reload(), 2000);
}
