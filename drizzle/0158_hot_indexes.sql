-- Indexes for hot query paths surfaced by the 2026-07 correctness audit.
-- Column names are backticked (`read` is a reserved word in MySQL).

-- Claim/webhook/refund lookups scan the ledger by (sourceRef, source).
CREATE INDEX `user_token_ledger_sourceRef_source_idx` ON `user_token_ledger` (`sourceRef`, `source`);
-- The private-balance cache recompute sums the ledger by (userId, tokenType).
CREATE INDEX `user_token_ledger_user_token_idx` ON `user_token_ledger` (`userId`, `tokenType`);

-- Tier/rite counting selects all completions for a user.
CREATE INDEX `quest_completions_userId_idx` ON `quest_completions` (`userId`);
-- Public completion feeds order by completedAt within a visibility.
CREATE INDEX `quest_completions_visibility_completedAt_idx` ON `quest_completions` (`visibility`, `completedAt`);

-- The unread-count query runs on nearly every authenticated page load.
CREATE INDEX `user_notifications_user_read_created_idx` ON `user_notifications` (`userId`, `read`, `createdAt`);
