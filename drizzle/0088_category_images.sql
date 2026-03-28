-- Add imageUrl column to forumCategories for category card images
ALTER TABLE forumCategories ADD COLUMN imageUrl VARCHAR(500) DEFAULT NULL;
