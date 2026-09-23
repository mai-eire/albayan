-- A family's class preference becomes a name ("Level 3") rather than a class row: a class
-- is a name on a day, and a family may name the level without naming the day. SQLite will
-- not drop a column a foreign key points at, so the table is rebuilt.
PRAGMA defer_foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text,
	`user_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`gender` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`country_of_origin` text,
	`school_year_group` text,
	`is_homeschooled` integer DEFAULT false NOT NULL,
	`arabic_proficiency` text DEFAULT 'none' NOT NULL,
	`email` text,
	`phone` text,
	`allergies` text,
	`medical_notes` text,
	`status` text DEFAULT 'applied' NOT NULL,
	`application_year_id` text,
	`preferred_session_id` integer,
	`preferred_class_name` text,
	`application_notes` text,
	`offer_note` text,
	`declined_reason` text,
	`applied_at` text NOT NULL,
	`approved_at` text,
	`declined_at` text,
	`created_by_guardian_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`application_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preferred_session_id`) REFERENCES `school_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "students_gender" CHECK("__new_students"."gender" in ('male', 'female')),
	CONSTRAINT "students_arabic" CHECK("__new_students"."arabic_proficiency" in ('none', 'beginner', 'intermediate', 'advanced', 'native')),
	CONSTRAINT "students_status_check" CHECK("__new_students"."status" in ('applied', 'active', 'inactive', 'declined'))
);--> statement-breakpoint
INSERT INTO `__new_students` (`id`, `student_id`, `user_id`, `first_name`, `last_name`, `gender`, `date_of_birth`, `country_of_origin`, `school_year_group`, `is_homeschooled`, `arabic_proficiency`, `email`, `phone`, `allergies`, `medical_notes`, `status`, `application_year_id`, `preferred_session_id`, `preferred_class_name`, `application_notes`, `offer_note`, `declined_reason`, `applied_at`, `approved_at`, `declined_at`, `created_by_guardian_id`, `created_at`, `updated_at`)
SELECT `id`, `student_id`, `user_id`, `first_name`, `last_name`, `gender`, `date_of_birth`, `country_of_origin`, `school_year_group`, `is_homeschooled`, `arabic_proficiency`, `email`, `phone`, `allergies`, `medical_notes`, `status`, `application_year_id`, `preferred_session_id`, (SELECT `name` FROM `classes` WHERE `classes`.`id` = `students`.`preferred_class_id`), `application_notes`, `offer_note`, `declined_reason`, `applied_at`, `approved_at`, `declined_at`, `created_by_guardian_id`, `created_at`, `updated_at`
FROM `students`;--> statement-breakpoint
DROP TABLE `students`;--> statement-breakpoint
ALTER TABLE `__new_students` RENAME TO `students`;--> statement-breakpoint
PRAGMA defer_foreign_keys=OFF;--> statement-breakpoint
CREATE UNIQUE INDEX `students_studentId_unique` ON `students` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_userId_unique` ON `students` (`user_id`);--> statement-breakpoint
CREATE INDEX `students_status` ON `students` (`status`);--> statement-breakpoint
CREATE INDEX `students_application_year` ON `students` (`application_year_id`);
