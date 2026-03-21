-- Rollback for 0059_onboarding_quests_category.sql
-- Removes the onboarding-quests forum category (only if safe — verify no posts exist first)
-- WARNING: Run this only if the category has no posts, or move posts to another category first.
DELETE FROM forumCategories WHERE slug = 'onboarding-quests';
