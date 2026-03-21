// Sentry is deferred until after page load — it's non-essential for rendering
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
import { getCsrfToken, initCsrfToken } from "@/hooks/useCsrfToken";

// Prime CSRF token cache early so it's available for the first mutation
initCsrfToken();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Keep data fresh for 60s — prevents redundant refetches on tab switch / navigation
      staleTime: 60_000,
      // Keep unused query data in cache for 5 minutes
      gcTime: 5 * 60_000,
      // Don't retry on 4xx errors (auth failures, not-found) — only on network errors
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

  // Save current path so we can return after login
  const currentPath = window.location.pathname + window.location.search;
  if (currentPath && currentPath !== "/" && !currentPath.startsWith("/login")) {
    sessionStorage.setItem("returnTo", currentPath);
  }

  window.location.href = getLoginUrl();
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

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // SW registration is best-effort; silently ignore failures
    });
  });
}

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
