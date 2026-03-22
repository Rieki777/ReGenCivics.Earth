-- Migration: event_enhancements
-- Adds phone, signupType (waitlist), maxAttendees, forumThreadId, and agenda_suggestions

-- #4 SMS reminders: phone number on signups
ALTER TABLE event_signups
  ADD COLUMN phone varchar(30) DEFAULT NULL AFTER email;

-- #11 Waitlist: signup type field
ALTER TABLE event_signups
  ADD COLUMN signupType ENUM('reminder','waitlist') DEFAULT 'reminder' NOT NULL AFTER phone;

-- #11 Waitlist: capacity cap on events
ALTER TABLE events
  ADD COLUMN maxAttendees int DEFAULT NULL AFTER episodeNumber;

-- #6 Forum thread: link event to its pre-event discussion thread
ALTER TABLE events
  ADD COLUMN forumThreadId int DEFAULT NULL AFTER maxAttendees;

-- #9 Agenda suggestions
CREATE TABLE IF NOT EXISTS agenda_suggestions (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  eventId       INT NOT NULL,
  authorEmail   VARCHAR(320) NOT NULL,
  authorName    VARCHAR(255),
  suggestion    TEXT NOT NULL,
  status        ENUM('pending','approved','rejected') DEFAULT 'pending' NOT NULL,
  createdAt     TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  INDEX agenda_suggestions_eventId_idx (eventId),
  INDEX agenda_suggestions_status_idx (status)
);
