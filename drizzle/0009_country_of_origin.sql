ALTER TABLE `students` RENAME COLUMN `ethnicity` TO `country_of_origin`;--> statement-breakpoint
ALTER TABLE `guardians` RENAME COLUMN `ethnicity` TO `country_of_origin`;--> statement-breakpoint
ALTER TABLE `students` ADD `is_homeschooled` integer DEFAULT false NOT NULL;--> statement-breakpoint
UPDATE `students` SET `country_of_origin` = NULL WHERE `country_of_origin` IN ('Arab', 'Asian', 'Black', 'White', 'Other');--> statement-breakpoint
UPDATE `guardians` SET `country_of_origin` = NULL WHERE `country_of_origin` IN ('Arab', 'Asian', 'Black', 'White', 'Other');
