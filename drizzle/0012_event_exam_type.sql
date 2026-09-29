-- The office announces exam dates, and there was no type for them; everything else it puts
-- on the calendar already had one. SQLite cannot alter a CHECK constraint, so the table is
-- rebuilt, and event_targets and event_participants point at it, hence defer_foreign_keys.
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`start_at` text NOT NULL,
	`end_at` text NOT NULL,
	`location` text,
	`is_published` integer DEFAULT false NOT NULL,
	`requires_registration` integer DEFAULT false NOT NULL,
	`requires_consent` integer DEFAULT false NOT NULL,
	`fee_cents` integer,
	`audience` text DEFAULT 'whole_school' NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "events_type" CHECK("__new_events"."type" in ('trip', 'camp', 'summer_school', 'club', 'sports_day', 'community', 'parent_teacher_meeting', 'exam', 'holiday', 'closure', 'other')),
	CONSTRAINT "events_audience" CHECK("__new_events"."audience" in ('whole_school', 'selected_sessions', 'selected_classes')),
	CONSTRAINT "events_dates" CHECK("__new_events"."end_at" >= "__new_events"."start_at"),
	CONSTRAINT "events_fee" CHECK("__new_events"."fee_cents" is null or "__new_events"."fee_cents" >= 0)
);--> statement-breakpoint
INSERT INTO `__new_events` SELECT * FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
CREATE INDEX `events_start` ON `events` (`start_at`);--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;
