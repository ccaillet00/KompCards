USE kompcards_db;

CREATE TABLE IF NOT EXISTS `curriculum` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`code` VARCHAR(10) NOT NULL UNIQUE COMMENT 'code of the curriculum',
	`titel` TEXT NOT NULL COMMENT 'titel of the curriculum',
	PRIMARY KEY(`id`)
) COMMENT='curriculum (Rahmenlehrplan) such as RLP_INF for Informatik';


CREATE TABLE IF NOT EXISTS `areas` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`curriculum_id` INTEGER UNSIGNED NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the curriculum',
	`code` VARCHAR(10) NOT NULL COMMENT 'code of the area',
	`titel` TEXT NOT NULL COMMENT 'titel of the area',
	PRIMARY KEY(`id`)
) COMMENT='Sections such as A1, A2, etc...';


CREATE TABLE IF NOT EXISTS `competencies` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`area_id` INTEGER UNSIGNED NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the areas',
	`code` VARCHAR(10) NOT NULL COMMENT 'code of the competencies',
	`description` TEXT NOT NULL COMMENT 'description from the competencies',
	PRIMARY KEY(`id`)
) COMMENT='Competencies A1.1, A1.2, etc...';

CREATE TABLE IF NOT EXISTS `competency_proof` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`user_id` VARCHAR(36) NOT NULL COMMENT 'Unique indentifier from the user',
	`competency_id` INTEGER UNSIGNED NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the competency',
	`copied_from_proof_id` INTEGER UNSIGNED DEFAULT NULL COMMENT 'Refers to the original document, if this card is a copy; NULL for newly issued cards',
	`status` INTEGER NOT NULL CHECK(status > 0 AND  status<= 10) COMMENT 'status of the competency proof. 1=draft, 2=llm_check, 3=llm_check_failed, 4=llm_check_finished, 5=saved, 6=discarded',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was initially created',
	`updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Timestamp when record was last modified',
	PRIMARY KEY(`id`)
);


CREATE TABLE IF NOT EXISTS `competency_input` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`competency_proof_id` INTEGER UNSIGNED NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the competency_proof',
	`user_role` TEXT NOT NULL COMMENT 'What role does the student play within the company?',
	`what` TEXT NOT NULL COMMENT 'The ‘what’ in the exercise of competence',
	`how` TEXT NOT NULL COMMENT 'The ‘how’ in the exercise of competence',
	`why` TEXT NOT NULL COMMENT 'The ‘why’ behind the exercise of competence',
	`environment` TEXT NOT NULL COMMENT 'Where was this plot carried out?',
	`subject` TEXT COMMENT 'The lecturer’s requests ',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was initially created',
	PRIMARY KEY(`id`)
);


CREATE TABLE IF NOT EXISTS `competency_llm_output` (
	`id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT COMMENT 'Unique indentifier for each record',
	`predecessor` INTEGER UNSIGNED COMMENT 'Refers to the previous LLM output during a revision; NULL on the first attempt',
	`competency_input_id` INTEGER UNSIGNED NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the competency_input',
	`work_result` TEXT NOT NULL COMMENT 'work result output from LLM',
	`quality` INTEGER NOT NULL CHECK(quality > 0 AND quality <= 4) COMMENT 'Assessment of the quality of the user’s LLM input. 1=very bad, 2=bad, 3=good, 4=very good',
	`llm_model` VARCHAR(100) NOT NULL COMMENT 'Which Model was used in this request',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was initially created',
	`overlap_curriculum` BOOLEAN NOT NULL COMMENT 'Does the Output overlap with the curriculum',
	`note_improvment` TEXT COMMENT 'Note improvments from the LLM',
	`is_saved` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'Did the user accept the generated output from the LLM',
	`user_feedback` VARCHAR(255) DEFAULT NULL COMMENT 'If the user is not happy with the output, he can retry it again with a feedback',
	PRIMARY KEY(`id`)
);


CREATE TABLE IF NOT EXISTS `userTable` (
	`id` VARCHAR(36) NOT NULL COMMENT 'Unique indentifier for each record',
	`name` TEXT NOT NULL COMMENT 'name of the user',
	`email` VARCHAR(255) NOT NULL UNIQUE COMMENT 'email from the user',
	`password_hash` VARCHAR(60) NOT NULL COLLATE utf8mb4_bin COMMENT 'password hashed from the user',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was initially created',
	PRIMARY KEY(`id`)
);


CREATE TABLE IF NOT EXISTS `userSession` (
	`id` VARCHAR(36) NOT NULL COMMENT 'Unique indentifier for each record',
	`user_id` VARCHAR(36) NOT NULL COMMENT 'Foreign key referencing the primary key (Id) of the user',
	`token_hash` VARCHAR(255) NOT NULL UNIQUE COLLATE utf8mb4_bin COMMENT 'hashed jwt token ',
	`expires_at` DATETIME NOT NULL COMMENT 'expiry date of the token',
	`created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when the record was initially created',
	`revoked_at` DATETIME DEFAULT NULL COMMENT 'Timestamp when the session is revoked',
	PRIMARY KEY(`id`)
);


ALTER TABLE `areas`
ADD FOREIGN KEY(`curriculum_id`) REFERENCES `curriculum`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `competencies`
ADD FOREIGN KEY(`area_id`) REFERENCES `areas`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `competency_llm_output`
ADD FOREIGN KEY(`competency_input_id`) REFERENCES `competency_input`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `competency_input`
ADD FOREIGN KEY(`competency_proof_id`) REFERENCES `competency_proof`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `competency_proof`
ADD FOREIGN KEY(`competency_id`) REFERENCES `competencies`(`id`)
ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE `competency_llm_output`
ADD FOREIGN KEY(`predecessor`) REFERENCES `competency_llm_output`(`id`)
ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE `competency_proof`
ADD FOREIGN KEY(`copied_from_proof_id`) REFERENCES `competency_proof`(`id`)
ON UPDATE NO ACTION ON DELETE NO ACTION;

ALTER TABLE `competency_proof`
ADD FOREIGN KEY(`user_id`) REFERENCES `userTable`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;

ALTER TABLE `userSession`
ADD FOREIGN KEY(`user_id`) REFERENCES `userTable`(`id`)
ON UPDATE NO ACTION ON DELETE CASCADE;