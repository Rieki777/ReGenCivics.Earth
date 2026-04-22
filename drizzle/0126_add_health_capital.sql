ALTER TABLE player_contributions MODIFY COLUMN capitalType ENUM('financial', 'social', 'cultural', 'living', 'intellectual', 'experiential', 'material', 'spiritual', 'health') NOT NULL;
