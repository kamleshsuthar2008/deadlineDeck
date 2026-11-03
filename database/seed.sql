-- DeadlineDeck Believable Seed Data
-- Demonstrates:
--   1. Real CS core subjects (DBMS, Operating Systems, Web Development, Data Structures, Discrete Mathematics)
--   2. Workload Map demonstration:
--      - Balanced Day (utilization <= 80%)
--      - Near Capacity Day (utilization > 80% and <= 100%)
--      - Overloaded Day (utilization > 100%, triggers coral warning & hatched bar)
--   3. Mix of task categories, priorities, due dates vs planned dates

USE `deadlinedeck`;

-- Demo student user (Email: aarav.sharma@college.edu, Password: Password@123)
-- bcrypt hash for 'Password@123' with 10 rounds:
-- $2b$10$w09d8n9p5mG2y2v4e4v1g.V8R1A.Xq8vK8v1g9b3p5mG2y2v4e4v1g is placeholder;
-- We insert or ignore if demo user already exists:
INSERT INTO `users` (`user_id`, `name`, `email`, `password_hash`, `default_study_hours`)
VALUES (
  1,
  'Aarav Sharma',
  'aarav.sharma@college.edu',
  '$2b$10$T8ZiqgHn8d7e2tK8uH7b6uW7Qv1n2k3l4m5n6o7p8q9r0s1t2u3v4',
  3.00
) ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- Core Computer Science & Engineering Subjects
INSERT INTO `subjects` (`subject_id`, `user_id`, `subject_name`, `subject_code`)
VALUES
  (1, 1, 'Database Management Systems', 'CS301'),
  (2, 1, 'Operating Systems', 'CS302'),
  (3, 1, 'Web Development', 'CS303'),
  (4, 1, 'Data Structures & Algorithms', 'CS304'),
  (5, 1, 'Discrete Mathematics', 'MA301')
ON DUPLICATE KEY UPDATE `subject_name` = VALUES(`subject_name`);

-- Workload Demonstration Tasks:
-- Assume Current Demonstration Week spans Monday through Sunday.
-- We use CURDATE() and DATE_ADD() so the seed always displays fresh, active days regardless of when seeded!

-- Day 1: CURDATE() -> BALANCED DAY (Capacity 3.0h, Tasks = 2.0h -> 66.7% Balanced)
INSERT INTO `tasks` (`user_id`, `subject_id`, `title`, `description`, `task_type`, `due_date`, `planned_date`, `estimated_hours`, `priority`, `status`)
VALUES
  (1, 1, 'SQL Joins & Grouping Lab Sheet', 'Complete exercises on nested subqueries, grouping, and inner/left joins.', 'Practical', DATE_ADD(CURDATE(), INTERVAL 1 DAY), CURDATE(), 1.00, 'High', 'Pending'),
  (1, 3, 'CSS Grid & Flexbox Layout Refactor', 'Re-align dashboard container using 4px spacing and hairline borders.', 'Assignment', DATE_ADD(CURDATE(), INTERVAL 2 DAY), CURDATE(), 1.00, 'Medium', 'Pending');

-- Day 2: CURDATE() + 1 -> NEAR CAPACITY DAY (Capacity 3.0h, Tasks = 2.75h -> 91.7% Near Capacity)
INSERT INTO `tasks` (`user_id`, `subject_id`, `title`, `description`, `task_type`, `due_date`, `planned_date`, `estimated_hours`, `priority`, `status`)
VALUES
  (1, 2, 'CPU Scheduling Algorithms Simulation', 'Implement Round Robin and SJF in C with average turnaround time calculation.', 'Assignment', DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1.75, 'High', 'Pending'),
  (1, 5, 'Propositional Logic Problem Set 4', 'Verify tautologies and inference rules for predicate calculus section.', 'Assignment', DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 1 DAY), 1.00, 'Medium', 'Pending');

-- Day 3: CURDATE() + 2 -> OVERLOADED DAY (Capacity 3.0h, Tasks = 1.5 + 1.0 + 1.0 = 3.5h -> 116.7% Overloaded!)
-- Matches the exact worked example in the specification!
INSERT INTO `tasks` (`user_id`, `subject_id`, `title`, `description`, `task_type`, `due_date`, `planned_date`, `estimated_hours`, `priority`, `status`)
VALUES
  (1, 1, 'DBMS Assignment 3: Relational Algebra & Normalization', '3NF and BCNF decomposition proofs and dependency preservation checks.', 'Assignment', DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1.50, 'High', 'Pending'),
  (1, 3, 'Web Development Practical: RESTful API Integration', 'Connect vanilla JS fetch calls to Express endpoints with error handling.', 'Practical', DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1.00, 'High', 'Pending'),
  (1, 2, 'OS Revision: Process Synchronization & Semaphores', 'Review dining philosophers and producer-consumer problem with mutex.', 'Revision', DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 1.00, 'Medium', 'Pending');

-- Day 4: CURDATE() + 3 -> BALANCED (Capacity 4.0h set in capacity override, Tasks = 2.5h -> 62.5%)
INSERT INTO `tasks` (`user_id`, `subject_id`, `title`, `description`, `task_type`, `due_date`, `planned_date`, `estimated_hours`, `priority`, `status`)
VALUES
  (1, 4, 'DSA Binary Search Tree Traversals', 'Iterative in-order, pre-order and post-order using explicit stack.', 'Practical', DATE_ADD(CURDATE(), INTERVAL 5 DAY), DATE_ADD(CURDATE(), INTERVAL 3 DAY), 2.50, 'Medium', 'Pending');

-- Day 5: CURDATE() + 4 -> OVERDUE TASK & COMPLETED TASK EXAMPLE
INSERT INTO `tasks` (`user_id`, `subject_id`, `title`, `description`, `task_type`, `due_date`, `planned_date`, `estimated_hours`, `priority`, `status`)
VALUES
  (1, 5, 'Graph Theory Minimum Spanning Tree Notes', 'Kruskal and Prim algorithm proofs.', 'Revision', DATE_SUB(CURDATE(), INTERVAL 1 DAY), DATE_SUB(CURDATE(), INTERVAL 1 DAY), 1.00, 'High', 'Pending'),
  (1, 4, 'Array Sorting Benchmark Report', 'Quicksort vs Mergesort performance comparison graph.', 'Assignment', DATE_SUB(CURDATE(), INTERVAL 2 DAY), DATE_SUB(CURDATE(), INTERVAL 2 DAY), 2.00, 'Low', 'Completed');

-- Date-specific capacity override demonstration for Day 4 (Curdate + 3 days has 4 hours available)
INSERT INTO `study_capacity` (`user_id`, `capacity_date`, `available_hours`)
VALUES (1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), 4.00)
ON DUPLICATE KEY UPDATE `available_hours` = VALUES(`available_hours`);

-- Sample Academic Quick Notes
INSERT INTO `notes` (`user_id`, `subject_id`, `title`, `content`, `is_pinned`)
VALUES
  (1, 1, 'ACID Properties in DBMS', 'Atomicity: all-or-nothing execution.\nConsistency: preserves database invariants.\nIsolation: concurrent transactions execute independently.\nDurability: committed transactions survive system crashes.', 1),
  (1, 2, 'Critical Section Solution Criteria', 'Must satisfy: 1. Mutual Exclusion, 2. Progress, 3. Bounded Waiting. Must not rely on relative CPU speeds.', 1),
  (1, 3, 'CSS Layout Box Model Rule', 'Always use box-sizing: border-box to keep padding and borders inside defined dimensions. Use tabular-nums for numeric columns.', 0);

-- Sample Assignment Checklist
INSERT INTO `checklists` (`checklist_id`, `user_id`, `task_id`, `title`)
VALUES (1, 1, 1, 'SQL Joins Lab Submission Checklist');

INSERT INTO `checklist_items` (`checklist_id`, `item_text`, `is_completed`, `sort_order`)
VALUES
  (1, 'Verify schema creation script runs without syntax errors', 1, 1),
  (1, 'Write complex 3-table join with GROUP BY and HAVING clauses', 1, 2),
  (1, 'Capture execution plan and format queries consistently', 0, 3),
  (1, 'Export PDF submission with tabular result screenshots', 0, 4);

-- Sample Completed Study Sessions
INSERT INTO `study_sessions` (`user_id`, `task_id`, `planned_date`, `duration_minutes`)
VALUES
  (1, 1, CURDATE(), 45),
  (1, 2, CURDATE(), 30);
