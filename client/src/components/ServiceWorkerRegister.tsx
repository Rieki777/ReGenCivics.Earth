/**
 * Service Worker Registration Component
 * Registers the service worker and handles updates.
 *
 * This is the only reload path. The generated worker calls skipWaiting() and
 * clientsClaim(), which fires controllerchange on a brand-new visit too.
 * That first claim is not an update. A later claim, while a controller was
 * already running, reloads once. On a week board, a focused field or a live
 * mic holds the reload until the tab is hidden, and a button offers it sooner.
 *
 * Registration is navigator.serviceWorker.register("/sw.js"). The Vite PWA
 * plugin is set to injectRegister: false so it does not also inject
 * registerSW.js, which reloads on every update and would skip this hold.
 * Importing virtual:pwa-register pulls workbox-window into the app bundle
 * and the production build cannot resolve it.
 */

import { useEffect, useState } from "react";
import {
  controllerReloadAction,
  SW_REFRESH_LABEL,
} from "./serviceWorkerReload";

function fieldFocused(el: Element | null): boolean {
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement;
}

export function ServiceWorkerRegister() {
  const [updateReady, setUpdateReady] = useState(false);

  useEffect(() => {
    if (import.meta.env.MODE !== "production" && !import.meta.env.VITE_ENABLE_SW) {
      if (import.meta.env.DEV) console.log("[SW] Service worker registration disabled in development");
      return;
    }

    if (!("serviceWorker" in navigator)) {
      if (import.meta.env.DEV) console.log("[SW] Service workers not supported");
      return;
    }

    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    let deferred = false;
    let timer = 0;
    let cancelled = false;
    const cleanups: Array<() => void> = [];

    const reload = () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    };

    const onChange = () => {
      const action = controllerReloadAction({
        hadController,
        refreshing: refreshing || deferred,
        pathname: window.location.pathname,
        fieldFocused: fieldFocused(document.activeElement),
        dictationListening: document.querySelector("[data-listening='true']") != null,
      });
      if (action === "skip") return;
      if (action === "defer") {
        deferred = true;
        setUpdateReady(true);
        const onHide = () => {
          if (document.visibilityState === "hidden") reload();
        };
        document.addEventListener("visibilitychange", onHide);
        cleanups.push(() => document.removeEventListener("visibilitychange", onHide));
        return;
      }
      reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", onChange);
    cleanups.push(() => navigator.serviceWorker.removeEventListener("controllerchange", onChange));

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((registration) => {
      if (cancelled) return;
      const check = () => {
        registration.update().catch((e) => console.error("[SW] Update check failed:", e));
      };
      timer = window.setInterval(check, 6 * 60 * 60 * 1000);
      const onVis = () => {
        if (document.visibilityState === "visible") check();
      };
      document.addEventListener("visibilitychange", onVis);
      cleanups.push(() => document.removeEventListener("visibilitychange", onVis));
    }).catch((error) => {
      console.error("[SW] Service worker registration failed:", error);
    });

    return () => {
      cancelled = true;
      if (timer) window.clearInterval(timer);
      for (const fn of cleanups) fn();
    };
  }, []);

  if (!updateReady) return null;
  return (
    <button
      type="button"
      onClick={() => window.location.reload()}
      style={{
        position: "fixed",
        zIndex: 100001,
        right: 16,
        bottom: 16,
        background: "#0a1f14",
        color: "#f0ebe3",
        border: "2px solid #7dd87d",
        borderRadius: 12,
        padding: "10px 14px",
        font: "800 15px/1.3 Nunito, system-ui, sans-serif",
        cursor: "pointer",
      }}
    >
      {SW_REFRESH_LABEL}
    </button>
  );
}

/**
 * Force update service worker
 */
export async function forceUpdateServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers not supported");
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error("No service worker registered");
  }

  if (registration.waiting) {
    registration.waiting.postMessage({ type: "SKIP_WAITING" });
    return;
  }

  await registration.update();
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Service workers not supported");
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error("No service worker registered");
  }

  if (registration.active) {
    registration.active.postMessage({ type: "CLEAR_CACHE" });
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith("regen-civics-"))
      .map((cacheName) => caches.delete(cacheName))
  );
}
