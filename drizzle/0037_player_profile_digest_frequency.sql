ALTER TABLE `player_profiles` ADD `emailDigestFrequency` enum('never','weekly','monthly','seasonal') DEFAULT 'monthly' NOT NULL;
