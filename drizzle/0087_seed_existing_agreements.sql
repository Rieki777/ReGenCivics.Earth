-- Seed existing community guidelines as ratified agreements (authorId 1 = Rye)
INSERT INTO communityAgreements (authorId, title, description, category, status, voteCount) VALUES
(1, 'Honesty', 'Share what you actually experienced, believe, or don''t know. Uncertainty is welcome here.', 'Forum Conduct', 'ratified', 0),
(1, 'Respect', 'Every person in this space is doing their best with what they have.', 'Forum Conduct', 'ratified', 0),
(1, 'Curiosity', 'Ask questions before assuming. Learning together is the point.', 'Forum Conduct', 'ratified', 0),
(1, 'Regeneration', 'We care about outcomes that restore rather than extract, in our land practices and in how we treat each other.', 'Forum Conduct', 'ratified', 0),
(1, 'Address ideas, not people', 'Disagreement is normal and often useful. Address the idea, not the person who holds it. Ask a question before assuming someone meant harm.', 'Moderation', 'ratified', 0),
(1, 'No spam or misinformation', 'No repeated low-effort posts, irrelevant links, or automated content. If sharing something as fact, be prepared to back it up. If it is opinion, say so.', 'Moderation', 'ratified', 0);
