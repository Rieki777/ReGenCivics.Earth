-- The Ship's Inventory bag, the Shipwright knowledge base + case log, the gear
-- manifest checks, and the crew list. SHIP_MAINTAINER_INVENTORY (sections 1, 2)
-- and SHIP_V5_FLYWHEEL (sections 1, 4).

CREATE TABLE IF NOT EXISTS `ship_inventory_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(160) NOT NULL,
  `slug` varchar(160) NOT NULL,
  `category` enum('adventure','galley','water','power','connectivity','tools','magic','comfort','safety') NOT NULL DEFAULT 'comfort',
  `description` text,
  `lore` text,
  `iconUrl` varchar(512),
  `photoUrl` varchar(512),
  `quantity` int NOT NULL DEFAULT 1,
  `storagePlace` varchar(200),
  `activityTags` json,
  `isVisible` boolean NOT NULL DEFAULT true,
  `isGearChecked` boolean NOT NULL DEFAULT false,
  `sortOrder` int NOT NULL DEFAULT 0,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE now(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `ship_inventory_slug_uq` (`slug`),
  KEY `ship_inventory_category_idx` (`category`),
  KEY `ship_inventory_sort_idx` (`sortOrder`),
  KEY `ship_inventory_visible_idx` (`isVisible`)
);

CREATE TABLE IF NOT EXISTS `ship_knowledge_chunks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(255) NOT NULL,
  `content` text NOT NULL,
  `system` enum('chassis','engine','propane','electrical','plumbing','slides','generator','appliances','starlink','water_filtration','tires_brakes','hvac','general') NOT NULL DEFAULT 'general',
  `sourceType` enum('manual','service_bulletin','forum_wisdom','resolved_case') NOT NULL DEFAULT 'manual',
  `sourceRef` varchar(512),
  `tags` json,
  `isApproved` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ship_knowledge_system_idx` (`system`),
  KEY `ship_knowledge_approved_idx` (`isApproved`),
  FULLTEXT KEY `ship_knowledge_content_ft` (`title`,`content`)
);

CREATE TABLE IF NOT EXISTS `ship_maintenance_cases` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int,
  `reportedByUserId` int NOT NULL,
  `system` enum('chassis','engine','propane','electrical','plumbing','slides','generator','appliances','starlink','water_filtration','tires_brakes','hvac','general') NOT NULL DEFAULT 'general',
  `title` varchar(255) NOT NULL,
  `description` text,
  `photoUrls` json,
  `conversation` json,
  `status` enum('open','advised','resolved','escalated') NOT NULL DEFAULT 'open',
  `isEscalation` boolean NOT NULL DEFAULT false,
  `resolution` text,
  `whatWorked` text,
  `approvedIntoKb` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `resolvedAt` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `ship_case_status_idx` (`status`),
  KEY `ship_case_booking_idx` (`bookingId`)
);

CREATE TABLE IF NOT EXISTS `ship_gear_checks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bookingId` int NOT NULL,
  `phase` enum('boarding','return') NOT NULL,
  `items` json,
  `completedByUserId` int,
  `witnessedByKeeperId` int,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ship_gear_booking_idx` (`bookingId`)
);

CREATE TABLE IF NOT EXISTS `ship_crew_list_signups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `email` varchar(320) NOT NULL,
  `userId` int,
  `interests` json,
  `source` varchar(120),
  `confirmedAt` timestamp NULL DEFAULT NULL,
  `unsubscribeToken` varchar(64) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  PRIMARY KEY (`id`),
  KEY `ship_crewlist_email_idx` (`email`)
);
