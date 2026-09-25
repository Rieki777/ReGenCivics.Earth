-- Email choices for accounts that have no player profile yet.
--
-- Notification prefs have lived on player_profiles.notificationPrefs since
-- 0085. An account made from a magic link or the contribution sign-up nudge has
-- no player profile, so /settings/notifications refused to save its choices,
-- while campaign notices already reached it by email.
--
-- Those accounts now store their prefs here, on the users row. The profile
-- column still wins whenever the profile holds prefs; this one is read only
-- when there is no profile, or the profile's prefs are NULL (someone who saved
-- here first and made a profile later). The one read rule lives in
-- getStoredNotificationPrefs (server/lib/notification-email.ts).
--
-- Additive and nullable. It must be applied BEFORE the code deploys: users is
-- in schema.ts, so every drizzle select on users names this column, and a
-- missing column would break sign-in, not only this page.
ALTER TABLE `users`
  ADD COLUMN `notificationPrefs` JSON NULL DEFAULT NULL;
