-- The email sign-in link opens where the person started.
--
-- Until now /api/auth/email/verify always sent people to "/", so someone who
-- asked for a link from a project page or /sign-in landed on the home page in
-- the new tab. The request now stores the page they came from next to the
-- token, and verify redirects there.
--
-- Stored server-side on purpose: the emailed URL carries only the token, so
-- nobody can hand-edit the destination. The value is a same-site path that
-- passed normalizeReturnTo (shared/oauthReturnTo.ts) and verify re-checks it.
-- NULL means no destination was given; verify falls back to /profile.
--
-- Additive and nullable: old code never reads or writes it. It must be applied
-- before the code that writes it deploys, or the request insert fails.
ALTER TABLE `email_tokens`
  ADD COLUMN `returnTo` VARCHAR(512) NULL DEFAULT NULL;
