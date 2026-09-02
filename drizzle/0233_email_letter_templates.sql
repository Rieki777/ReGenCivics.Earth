ALTER TABLE `emailTemplates`
  ADD COLUMN `bodyFormat` varchar(16) NOT NULL DEFAULT 'html',
  ADD COLUMN `layout` varchar(32) DEFAULT NULL,
  ADD COLUMN `label` varchar(120) DEFAULT NULL;
