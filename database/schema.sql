-- DeadlineDeck Database Schema
-- Academic Workload Planning and Student Productivity Platform

CREATE DATABASE IF NOT EXISTS `deadlinedeck`
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE `deadlinedeck`;

-- 1. Users table
CREATE TABLE IF NOT EXISTS `users` (
  `user_id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password_hash` VARCHAR(255) NOT NULL,
  `default_study_hours` DECIMAL(4,2) NOT NULL DEFAULT 4.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Subjects table
CREATE TABLE IF NOT EXISTS `subjects` (
  `subject_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `subject_name` VARCHAR(100) NOT NULL,
  `subject_code` VARCHAR(20) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY `uk_user_subject_code` (`user_id`, `subject_code`),
  CONSTRAINT `fk_subjects_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tasks table
CREATE TABLE IF NOT EXISTS `tasks` (
  `task_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `subject_id` INT NOT NULL,
  `title` VARCHAR(200) NOT NULL,
  `description` TEXT NULL,
  `task_type` ENUM(
    'Assignment',
    'Practical',
    'Project',
    'Quiz',
    'Internal Examination',
    'End-Term Examination',
    'Revision',
    'Other'
  ) NOT NULL DEFAULT 'Assignment',
  `due_date` DATE NOT NULL,
  `planned_date` DATE NOT NULL,
  `estimated_hours` DECIMAL(4,2) NOT NULL DEFAULT 1.00,
  `priority` ENUM('High', 'Medium', 'Low') NOT NULL DEFAULT 'Medium',
  `status` ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_tasks_user_planned` (`user_id`, `planned_date`),
  KEY `idx_tasks_user_due` (`user_id`, `due_date`),
  KEY `idx_tasks_user_status` (`user_id`, `status`),
  CONSTRAINT `fk_tasks_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tasks_subject` FOREIGN KEY (`subject_id`)
    REFERENCES `subjects` (`subject_id`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Study Capacity table (Daily available hours override)
CREATE TABLE IF NOT EXISTS `study_capacity` (
  `capacity_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `capacity_date` DATE NOT NULL,
  `available_hours` DECIMAL(4,2) NOT NULL,
  UNIQUE KEY `uk_user_capacity_date` (`user_id`, `capacity_date`),
  KEY `idx_capacity_user_date` (`user_id`, `capacity_date`),
  CONSTRAINT `fk_capacity_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Notes table (Quick notes with subject association)
CREATE TABLE IF NOT EXISTS `notes` (
  `note_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `subject_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `content` MEDIUMTEXT NULL,
  `is_pinned` TINYINT(1) NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY `idx_notes_user_pinned` (`user_id`, `is_pinned`),
  CONSTRAINT `fk_notes_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_notes_subject` FOREIGN KEY (`subject_id`)
    REFERENCES `subjects` (`subject_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Checklists table (Assignment checklist builder)
CREATE TABLE IF NOT EXISTS `checklists` (
  `checklist_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `task_id` INT NULL,
  `title` VARCHAR(200) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_checklists_user` (`user_id`),
  CONSTRAINT `fk_checklists_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_checklists_task` FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`task_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Checklist Items table
CREATE TABLE IF NOT EXISTS `checklist_items` (
  `item_id` INT AUTO_INCREMENT PRIMARY KEY,
  `checklist_id` INT NOT NULL,
  `item_text` VARCHAR(255) NOT NULL,
  `is_completed` TINYINT(1) NOT NULL DEFAULT 0,
  `sort_order` INT NOT NULL DEFAULT 0,
  KEY `idx_items_checklist` (`checklist_id`, `sort_order`),
  CONSTRAINT `fk_items_checklist` FOREIGN KEY (`checklist_id`)
    REFERENCES `checklists` (`checklist_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. Study Sessions table (Study session planner history)
CREATE TABLE IF NOT EXISTS `study_sessions` (
  `session_id` INT AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT NOT NULL,
  `task_id` INT NULL,
  `planned_date` DATE NOT NULL,
  `duration_minutes` INT NOT NULL,
  `completed_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_sessions_user_date` (`user_id`, `planned_date`),
  CONSTRAINT `fk_sessions_user` FOREIGN KEY (`user_id`)
    REFERENCES `users` (`user_id`) ON DELETE CASCADE,
  CONSTRAINT `fk_sessions_task` FOREIGN KEY (`task_id`)
    REFERENCES `tasks` (`task_id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 9. Sessions table for express-mysql-session
CREATE TABLE IF NOT EXISTS `sessions` (
  `session_id` VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
  `expires` INT(11) UNSIGNED NOT NULL,
  `data` MEDIUMTEXT COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
