-- Move all threads from active-organisations to alliance-partners category
-- So /community/c/alliance-partners shows accepted alliance org threads
UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'alliance-partners')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-organisations');
