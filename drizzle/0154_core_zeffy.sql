-- Migration 0154: Zeffy support for CORE donations
-- Run with: npx tsx scripts/run-migration.ts drizzle/0154_core_zeffy.sql
--   (or: npx tsx scripts/run-migration.ts --all)
--
-- Zeffy is now the PREFERRED donation processor (zero platform fees for
-- nonprofits, unlike Stripe's ~2.9%+30c). Stripe remains as a secondary
-- fallback (ADR-19). This migration adds `provider` + Zeffy-specific
-- reference columns to church_donations, additive only, no data loss.
-- Depends on migration 0153 (creates church_donations).

ALTER TABLE church_donations
  ADD COLUMN provider ENUM('stripe','zeffy') NOT NULL DEFAULT 'stripe' AFTER id,
  ADD COLUMN zeffyPaymentId VARCHAR(255) NULL AFTER stripeSubscriptionId,
  ADD COLUMN zeffyCampaignId VARCHAR(255) NULL AFTER zeffyPaymentId,
  ADD UNIQUE KEY church_donations_zeffy_payment_uq (zeffyPaymentId),
  ADD INDEX church_donations_provider_idx (provider, status);

-- Existing Stripe-era rows (if any were inserted before this migration ran)
-- already default to provider='stripe' via the column default, so no backfill
-- statement is needed.
