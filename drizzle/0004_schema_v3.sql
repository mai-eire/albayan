CREATE TABLE `payments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`enrolment_id` integer NOT NULL,
	`amount_cents` integer NOT NULL,
	`paid_on` text NOT NULL,
	`method` text NOT NULL,
	`reference` text,
	`paid_by_guardian_id` integer,
	`recorded_by_user_id` integer NOT NULL,
	`provider_ref` text,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`enrolment_id`) REFERENCES `enrolments`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by_guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "payments_amount" CHECK("payments"."amount_cents" > 0),
	CONSTRAINT "payments_method" CHECK("payments"."method" in ('cash', 'bank_transfer', 'card'))
);
--> statement-breakpoint
CREATE INDEX `payments_enrolment` ON `payments` (`enrolment_id`);--> statement-breakpoint
CREATE INDEX `payments_guardian` ON `payments` (`paid_by_guardian_id`);--> statement-breakpoint
CREATE TABLE `event_participants` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`student_id` integer NOT NULL,
	`status` text DEFAULT 'registered' NOT NULL,
	`consent_given_by_guardian_id` integer,
	`consent_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`consent_given_by_guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_participants_status" CHECK("event_participants"."status" in ('registered', 'withdrawn'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `event_participants_one` ON `event_participants` (`event_id`,`student_id`);--> statement-breakpoint
CREATE TABLE `event_targets` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`event_id` integer NOT NULL,
	`session_id` integer,
	`class_id` integer,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`session_id`) REFERENCES `school_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_targets_one" CHECK(("event_targets"."session_id" is not null) + ("event_targets"."class_id" is not null) = 1)
);
--> statement-breakpoint
CREATE INDEX `event_targets_event` ON `event_targets` (`event_id`);--> statement-breakpoint
CREATE TABLE `events` (
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
	CONSTRAINT "events_type" CHECK("events"."type" in ('trip', 'camp', 'summer_school', 'club', 'sports_day', 'community', 'parent_teacher_meeting', 'holiday', 'closure', 'other')),
	CONSTRAINT "events_audience" CHECK("events"."audience" in ('whole_school', 'selected_sessions', 'selected_classes')),
	CONSTRAINT "events_dates" CHECK("events"."end_at" >= "events"."start_at"),
	CONSTRAINT "events_fee" CHECK("events"."fee_cents" is null or "events"."fee_cents" >= 0)
);
--> statement-breakpoint
CREATE INDEX `events_start` ON `events` (`start_at`);