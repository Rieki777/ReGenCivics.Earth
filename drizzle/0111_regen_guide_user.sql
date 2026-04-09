INSERT INTO users (openId, name, email, loginMethod, role, handle, createdAt, updatedAt, lastSignedIn)
VALUES ('regen-guide-system', 'ReGen Guide', NULL, 'system', 'admin', 'regen-guide', NOW(), NOW(), NOW())
ON DUPLICATE KEY UPDATE name = 'ReGen Guide';

INSERT INTO player_profiles (userId, displayName, bio, avatarUrl, isVerified, isActive, createdAt, updatedAt)
SELECT u.id, 'ReGen Guide', 'AI companion for the ReGen Civics community. Comments are drafted by Claude and may include interpretations, suggestions, or questions from a systems-thinking point of view.', '/images/icons/regen-guide-avatar.png', 1, 1, NOW(), NOW()
FROM users u WHERE u.openId = 'regen-guide-system'
ON DUPLICATE KEY UPDATE displayName = 'ReGen Guide';
