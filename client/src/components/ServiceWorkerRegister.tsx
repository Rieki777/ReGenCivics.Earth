/**
 * Service Worker Registration Component
 * Registers the service worker and handles updates
 */

import { useEffect } from 'react';

export function ServiceWorkerRegister() {
  useEffect(() => {
    // Only register in production or if explicitly enabled
    if (import.meta.env.MODE !== 'production' && !import.meta.env.VITE_ENABLE_SW) {
      if (import.meta.env.DEV) console.log('[SW] Service worker registration disabled in development');
      return;
    }

    if (!('serviceWorker' in navigator)) {
      if (import.meta.env.DEV) console.log('[SW] Service workers not supported');
      return;
    }

    // Register the service worker
    const registerSW = async () => {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        if (import.meta.env.DEV) console.log('[SW] Service worker registered:', registration);

        // Check for updates periodically (every 6 hours)
        setInterval(async () => {
          try {
            await registration.update();
          } catch (error) {
            console.error('[SW] Update check failed:', error);
          }
        }, 6 * 60 * 60 * 1000);

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker is ready, notify user
              if (import.meta.env.DEV) console.log('[SW] New service worker available');
              notifyUpdate();
            }
          });
        });
      } catch (error) {
        console.error('[SW] Service worker registration failed:', error);
      }
    };

    registerSW();

    // Handle controller change (new service worker activated)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (import.meta.env.DEV) console.log('[SW] Service worker controller changed');
      // Page will be controlled by new service worker
    });
  }, []);

  return null;
}

/**
 * Notify user about service worker update
 */
function notifyUpdate() {
  // Show a toast or notification to user
  const message = 'New version available! Refresh to update.';
  console.log('[SW]', message);

  // You can integrate with your notification system here
  // For example: toast.info(message, { action: 'Refresh' })
}

/**
 * Force update service worker
 */
export async function forceUpdateServiceWorker(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error('No service worker registered');
  }

  // Send message to skip waiting
  if (registration.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    return;
  }

  await registration.update();
}

/**
 * Clear all service worker caches
 */
export async function clearServiceWorkerCache(): Promise<void> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Service workers not supported');
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    throw new Error('No service worker registered');
  }

  // Send message to clear cache
  if (registration.active) {
    registration.active.postMessage({ type: 'CLEAR_CACHE' });
  }

  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((cacheName) => cacheName.startsWith('regen-civics-'))
      .map((cacheName) => caches.delete(cacheName))
  );
}
