-- Migration: Move 10 Welcome Aboard quest threads from rites-of-passage to welcome-aboard-quests
-- Run AFTER 0072_onboarding_quests_category.sql (which creates welcome-aboard-quests category)
--
-- These threads were originally seeded into rites-of-passage by mistake.
-- They are Welcome Aboard content and belong in the welcome-aboard-quests category.

UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'welcome-aboard-quests')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'rites-of-passage');
