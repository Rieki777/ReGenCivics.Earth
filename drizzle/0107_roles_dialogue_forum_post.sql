INSERT INTO forumPosts (categoryId, authorId, title, content, isPinned, isLocked, viewCount, replyCount)
VALUES (
  (SELECT id FROM forumCategories WHERE slug = 'air-conversations'),
  1,
  'Roles Dialogue: what roles are missing from the game?',
  'We designed the current set of roles based on what the movement needed at launch. But the game grows with the people in it.

If you see a role that should exist and doesn''t, or a gap in what the current roles cover, bring it here. Describe the role you have in mind, what it does, and why it matters for the regenerative movement. We read everything posted here and use it to shape future seasons.

Some questions to get you started:

What kind of contribution do you make that doesn''t fit neatly into any current role? What skills or perspectives are underrepresented in the game right now? What role would you take on if it existed?

This thread feeds directly into season planning.',
  1,
  0,
  0,
  0
);
