INSERT INTO forumCategories (slug, name, description, icon, color, sortOrder)
VALUES ('rites-of-passage', 'Rites of Passage', 'Discussion threads for each of the 13 Rites of Passage quests -- share completions, ask questions, and connect with others on the same quest.', 'Flame', '#c77dba', 6)
ON DUPLICATE KEY UPDATE name=name;
