-- Terms acceptance recorded at booking time, with the version accepted, so old
-- acceptances stay auditable when the Voyage Covenant wording changes.
-- Nullable so existing bookings (pre-covenant) are untouched.
ALTER TABLE `ship_bookings`
  ADD COLUMN `agreementAcceptedAt` timestamp NULL,
  ADD COLUMN `agreementVersion` varchar(16) NULL;
