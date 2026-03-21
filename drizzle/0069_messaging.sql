CREATE TABLE `conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `conversations_createdAt_idx` (`createdAt`)
);

CREATE TABLE `conversationParticipants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversationId` int NOT NULL,
  `userId` int NOT NULL,
  `lastReadAt` timestamp NULL,
  `joinedAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `convParticipants_conversationId_idx` (`conversationId`),
  KEY `convParticipants_userId_idx` (`userId`),
  KEY `convParticipants_userId_convId_idx` (`userId`, `conversationId`)
);

CREATE TABLE `directMessages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `conversationId` int NOT NULL,
  `senderId` int NOT NULL,
  `content` text NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `deletedAt` timestamp NULL,
  PRIMARY KEY (`id`),
  KEY `directMessages_conversationId_idx` (`conversationId`),
  KEY `directMessages_senderId_idx` (`senderId`),
  KEY `directMessages_createdAt_idx` (`createdAt`)
);
