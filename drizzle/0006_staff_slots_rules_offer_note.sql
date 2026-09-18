ALTER TABLE `session_periods` ADD `staff_only` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `students` ADD `offer_note` text;--> statement-breakpoint
ALTER TABLE `school_settings` ADD `rules` text;