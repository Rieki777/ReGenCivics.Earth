-- Add video metadata columns to quest_completions for the completion video feed.
-- videoThumbnailUrl: poster image extracted or user-provided
-- videoDurationSeconds: length of the uploaded video in seconds
ALTER TABLE quest_completions
  ADD COLUMN videoThumbnailUrl VARCHAR(1000) DEFAULT NULL,
  ADD COLUMN videoDurationSeconds INT DEFAULT NULL;
