CREATE TABLE `attendance` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`class_id` integer NOT NULL,
	`date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`note` text,
	`recorded_by_user_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`recorded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "attendance_status" CHECK("attendance"."status" in ('present', 'absent', 'late', 'excused'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_student_date` ON `attendance` (`student_id`,`date`);--> statement-breakpoint
CREATE INDEX `attendance_class_date` ON `attendance` (`class_id`,`date`);--> statement-breakpoint
CREATE TABLE `homework` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`class_id` integer NOT NULL,
	`subject_id` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`due_date` text NOT NULL,
	`created_by_user_id` integer NOT NULL,
	`published_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `homework_class_due` ON `homework` (`class_id`,`due_date`);--> statement-breakpoint
CREATE TABLE `resources` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`kind` text NOT NULL,
	`storage_key` text,
	`mime_type` text,
	`size_bytes` integer,
	`url` text,
	`uploaded_by_user_id` integer NOT NULL,
	`audience` text DEFAULT 'students_and_guardians' NOT NULL,
	`is_school_wide` integer DEFAULT false NOT NULL,
	`class_id` integer,
	`subject_id` text,
	`homework_id` integer,
	`student_id` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`uploaded_by_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`class_id`) REFERENCES `classes`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`subject_id`) REFERENCES `subjects`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`homework_id`) REFERENCES `homework`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "resources_kind" CHECK("resources"."kind" in ('file', 'link')),
	CONSTRAINT "resources_audience" CHECK("resources"."audience" in ('students_and_guardians', 'guardians_only', 'staff_only')),
	CONSTRAINT "resources_kind_fields" CHECK(("resources"."kind" = 'file' and "resources"."storage_key" is not null and "resources"."url" is null) or ("resources"."kind" = 'link' and "resources"."url" is not null and "resources"."storage_key" is null)),
	CONSTRAINT "resources_one_target" CHECK(("resources"."is_school_wide") + ("resources"."class_id" is not null) + ("resources"."homework_id" is not null) + ("resources"."student_id" is not null) = 1 and ("resources"."subject_id" is null or "resources"."class_id" is not null))
);
--> statement-breakpoint
CREATE INDEX `resources_class` ON `resources` (`class_id`);--> statement-breakpoint
CREATE INDEX `resources_homework` ON `resources` (`homework_id`);--> statement-breakpoint
CREATE INDEX `resources_student` ON `resources` (`student_id`);--> statement-breakpoint
CREATE TABLE `student_notes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`student_id` integer NOT NULL,
	`author_user_id` integer NOT NULL,
	`body` text NOT NULL,
	`category` text DEFAULT 'general' NOT NULL,
	`visibility` text DEFAULT 'staff' NOT NULL,
	`deleted_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`student_id`) REFERENCES `students`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`author_user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "student_notes_category" CHECK("student_notes"."category" in ('general', 'praise', 'concern', 'behaviour')),
	CONSTRAINT "student_notes_visibility" CHECK("student_notes"."visibility" in ('staff', 'guardians', 'guardians_and_student'))
);
--> statement-breakpoint
CREATE INDEX `student_notes_student` ON `student_notes` (`student_id`);