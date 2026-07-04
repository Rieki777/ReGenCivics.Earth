/**
 * Push-only service worker module, imported by the Workbox-generated sw.js
 * via workbox.importScripts (vite.config.ts). Deliberately isolated: this
 * file contains ONLY push + notificationclick handlers and never touches
 * caching (a past outage traced to SW cache handling; Workbox owns all of
 * that). If this file's logic changes, bump the filename (push-sw-v2.js)
 * and the vite.config reference: imported scripts are cached with the SW
 * and a same-name edit may not propagate.
 */
/* eslint-disable no-undef */

self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Malformed payload: show a generic notification rather than nothing.
  }
  const title = data.title || 'ReGen Civics';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: data.tag || 'regen-civics',
      data: { url: data.url || '/notifications' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/notifications';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windows) => {
      // Reuse an open tab when there is one: focus it and navigate to the
      // deep link so the user lands scrolled to the exact comment.
      for (const client of windows) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) return client.navigate(url);
          return undefined;
        }
      }
      return clients.openWindow(url);
    })
  );
});
