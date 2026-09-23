ALTER TABLE `notifications` ADD `subject_id` text REFERENCES subjects(id);--> statement-breakpoint
ALTER TABLE `notifications` ADD `student_id` integer REFERENCES students(id);