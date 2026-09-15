CREATE TABLE `accounts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` integer NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` text,
	`refresh_token_expires_at` text,
	`scope` text,
	`password` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `accounts_user` ON `accounts` (`user_id`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`expires_at` text NOT NULL,
	`token` text NOT NULL,
	`ip_address` text,
	`user_agent` text,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_unique` ON `sessions` (`token`);--> statement-breakpoint
CREATE INDEX `sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`email_verified` integer DEFAULT false NOT NULL,
	`image` text,
	`username` text,
	`display_username` text,
	`phone` text,
	`is_admin` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`must_change_password` integer DEFAULT false NOT NULL,
	`last_login_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	CONSTRAINT "users_status" CHECK("users"."status" in ('active', 'invited', 'disabled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `users_username_unique` ON `users` (`username`);--> statement-breakpoint
CREATE TABLE `verifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`identifier` text NOT NULL,
	`value` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `verifications_identifier` ON `verifications` (`identifier`);--> statement-breakpoint
CREATE TABLE `guardians` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`address_line1` text,
	`address_line2` text,
	`city` text,
	`postal_code` text,
	`area` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`emergency_contact_relationship` text,
	`spoken_languages` text DEFAULT '[]' NOT NULL,
	`ethnicity` text,
	`registration_reasons` text DEFAULT '[]' NOT NULL,
	`registration_reason_other` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `guardians_userId_unique` ON `guardians` (`user_id`);--> statement-breakpoint
CREATE INDEX `guardians_area` ON `guardians` (`area`);--> statement-breakpoint
CREATE TABLE `teachers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`title` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teachers_userId_unique` ON `teachers` (`user_id`);--> statement-breakpoint
CREATE TABLE `academic_years` (
	`id` text PRIMARY KEY NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`standard_fee_cents` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `classes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`academic_year_id` text NOT NULL,
	`session_id` integer NOT NULL,
	`name` text NOT NULL,
	`class_teacher_id` integer,
	`room` text,
	`capacity` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`session_id`) REFERENCES `school_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `classes_session` ON `classes` (`session_id`);--> statement-breakpoint
CREATE TABLE `school_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`day_of_week` integer NOT NULL,
	`start_time` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "school_sessions_day" CHECK("school_sessions"."day_of_week" between 0 and 6)
);
--> statement-breakpoint
CREATE INDEX `school_sessions_year` ON `school_sessions` (`academic_year_id`);--> statement-breakpoint
CREATE TABLE `session_periods` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` integer NOT NULL,
	`sort_order` integer NOT NULL,
	`subject_id` text,
	`title` text,
	`duration_minutes` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `school_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "session_periods_one_of" CHECK(("session_periods"."subject_id" is null) <> ("session_periods"."title" is null)),
	CONSTRAINT "session_periods_duration" CHECK("session_periods"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE INDEX `session_periods_session` ON `session_periods` (`session_id`);--> statement-breakpoint
CREATE TABLE `subjects` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `teaching_assignments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`subject_id` text NOT NULL,
	`teacher_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`teacher_id`) REFERENCES `teachers`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `teaching_assignments_class_subject` ON `teaching_assignments` (`class_id`,`subject_id`);--> statement-breakpoint
CREATE INDEX `teaching_assignments_teacher` ON `teaching_assignments` (`teacher_id`);--> statement-breakpoint
CREATE TABLE `terms` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`academic_year_id` text NOT NULL,
	`name` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`academic_year_id`) REFERENCES `academic_years`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `terms_year` ON `terms` (`academic_year_id`);--> statement-breakpoint
CREATE TABLE `enrolments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text,
	`status` text DEFAULT 'active' NOT NULL,
	`fee_cents` integer NOT NULL,
	`fee_note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "enrolments_status" CHECK("enrolments"."status" in ('active', 'left')),
	CONSTRAINT "enrolments_fee" CHECK("enrolments"."fee_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `enrolments_one_active` ON `enrolments` (`student_id`) WHERE "enrolments"."status" = 'active';--> statement-breakpoint
CREATE INDEX `enrolments_class` ON `enrolments` (`class_id`);--> statement-breakpoint
CREATE TABLE `student_guardians` (
	`student_id` integer NOT NULL,
	`guardian_id` integer NOT NULL,
	`relationship` text NOT NULL,
	`is_primary_contact` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`student_id`, `guardian_id`),
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "student_guardians_relationship" CHECK("student_guardians"."relationship" in ('mother', 'father', 'guardian', 'grandparent', 'other'))
);
--> statement-breakpoint
CREATE INDEX `student_guardians_guardian` ON `student_guardians` (`guardian_id`);--> statement-breakpoint
CREATE TABLE `students` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` text,
	`user_id` integer,
	`first_name` text NOT NULL,
	`last_name` text NOT NULL,
	`gender` text NOT NULL,
	`date_of_birth` text NOT NULL,
	`ethnicity` text,
	`school_year_group` text,
	`arabic_proficiency` text DEFAULT 'none' NOT NULL,
	`email` text,
	`phone` text,
	`allergies` text,
	`medical_notes` text,
	`status` text DEFAULT 'applied' NOT NULL,
	`preferred_session_id` integer,
	`preferred_class_id` integer,
	`application_notes` text,
	`applied_at` text NOT NULL,
	`approved_at` text,
	`created_by_guardian_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preferred_session_id`) REFERENCES `school_sessions`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`preferred_class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_guardian_id`) REFERENCES `guardians`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "students_gender" CHECK("students"."gender" in ('male', 'female')),
	CONSTRAINT "students_arabic" CHECK("students"."arabic_proficiency" in ('none', 'beginner', 'intermediate', 'advanced', 'native')),
	CONSTRAINT "students_status_check" CHECK("students"."status" in ('applied', 'active', 'inactive', 'declined'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `students_studentId_unique` ON `students` (`student_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `students_userId_unique` ON `students` (`user_id`);--> statement-breakpoint
CREATE INDEX `students_status` ON `students` (`status`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`actor_user_id` integer,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`changes` text,
	`ip` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`actor_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `audit_log_entity` ON `audit_log` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`user_id` integer NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`href` text,
	`read_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `notifications_user` ON `notifications` (`user_id`,`read_at`);--> statement-breakpoint
CREATE TABLE `school_settings` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`timezone` text DEFAULT 'Europe/Dublin' NOT NULL,
	`student_id_prefix` text DEFAULT 'ALB' NOT NULL,
	`bank_account_name` text,
	`bank_iban` text,
	`bank_bic` text,
	`absence_emails` integer DEFAULT false NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
