ALTER TABLE `students` ADD `application_year_id` text REFERENCES academic_years(id);--> statement-breakpoint
ALTER TABLE `students` ADD `declined_at` text;--> statement-breakpoint
CREATE INDEX `students_application_year` ON `students` (`application_year_id`);--> statement-breakpoint
UPDATE `students` SET `application_year_id` = (
  SELECT `academic_year_id` FROM `school_sessions`
  WHERE `school_sessions`.`id` = `students`.`preferred_session_id`
) WHERE `preferred_session_id` IS NOT NULL;--> statement-breakpoint
UPDATE `students` SET `application_year_id` = (
  SELECT `id` FROM `academic_years` WHERE `is_current` = 1 LIMIT 1
) WHERE `application_year_id` IS NULL;--> statement-breakpoint
UPDATE `students` SET `declined_at` = `updated_at` WHERE `status` = 'declined';
