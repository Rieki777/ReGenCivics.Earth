-- Re-attribute official Land Projects catalog threads to the ReGen Civics Team.
-- Approval auto-create (applications.updateStatus) hardcoded authorId = 1
-- (Rieki Cordon), so those posts show a personal name. They are team catalog
-- posts, not personal discussions.
--
-- Scope is the land-projects category only. Replies are not touched.
-- Other forum categories stay on their current authors.
--
-- Idempotent: safe to run more than once and a no-op when the team user
-- is already the author.

INSERT INTO users (openId, name, email, handle, loginMethod, role)
SELECT 'team@regencivics.earth', 'ReGen Civics Team', 'team@regencivics.earth', 'regen-civics-team', 'system', 'admin'
FROM DUAL
WHERE NOT EXISTS (
  SELECT 1 FROM users
  WHERE email = 'team@regencivics.earth'
     OR openId = 'team@regencivics.earth'
     OR handle = 'regen-civics-team'
);

UPDATE users
SET name = 'ReGen Civics Team'
WHERE (email = 'team@regencivics.earth'
    OR openId = 'team@regencivics.earth'
    OR handle = 'regen-civics-team')
  AND (name IS NULL OR name <> 'ReGen Civics Team');

UPDATE forumPosts fp
INNER JOIN forumCategories fc ON fc.id = fp.categoryId AND fc.slug = 'land-projects'
INNER JOIN (
  SELECT id FROM users
  WHERE email = 'team@regencivics.earth'
     OR openId = 'team@regencivics.earth'
     OR handle = 'regen-civics-team'
  ORDER BY CASE
    WHEN email = 'team@regencivics.earth' THEN 0
    WHEN openId = 'team@regencivics.earth' THEN 1
    ELSE 2
  END
  LIMIT 1
) team ON 1=1
SET fp.authorId = team.id
WHERE fp.authorId <> team.id;
