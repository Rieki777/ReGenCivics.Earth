CREATE TABLE `postReactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `postId` int DEFAULT NULL,
  `replyId` int DEFAULT NULL,
  `emoji` varchar(8) NOT NULL,
  `createdAt` timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_reaction` (`userId`,`postId`,`replyId`,`emoji`),
  KEY `idx_postId` (`postId`),
  KEY `idx_replyId` (`replyId`),
  CONSTRAINT `postReactions_userId_fk` FOREIGN KEY (`userId`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postReactions_postId_fk` FOREIGN KEY (`postId`) REFERENCES `forumPosts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `postReactions_replyId_fk` FOREIGN KEY (`replyId`) REFERENCES `forumReplies` (`id`) ON DELETE CASCADE
);
