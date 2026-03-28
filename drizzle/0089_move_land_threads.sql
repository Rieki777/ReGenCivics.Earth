-- Move all threads from active-projects to land-projects category
-- So /community/c/land-projects shows accepted land project threads
UPDATE forumPosts
SET categoryId = (SELECT id FROM forumCategories WHERE slug = 'land-projects')
WHERE categoryId = (SELECT id FROM forumCategories WHERE slug = 'active-projects');
