const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

const VALID_TYPES = [
  'Assignment',
  'Practical',
  'Project',
  'Quiz',
  'Internal Examination',
  'End-Term Examination',
  'Revision',
  'Other'
];

const VALID_PRIORITIES = ['High', 'Medium', 'Low'];
const VALID_STATUSES = ['Pending', 'In Progress', 'Completed'];

/**
 * GET /api/tasks
 * Filterable, searchable task ledger
 */
router.get('/', async (req, res, next) => {
  try {
    const { subject_id, task_type, priority, status, search, sort } = req.query;

    let sql = `
      SELECT 
        t.task_id,
        t.user_id,
        t.subject_id,
        s.subject_name,
        s.subject_code,
        t.title,
        t.description,
        t.task_type,
        t.due_date,
        t.planned_date,
        t.estimated_hours,
        t.priority,
        t.status,
        t.created_at,
        t.updated_at
      FROM tasks t
      JOIN subjects s ON t.subject_id = s.subject_id
      WHERE t.user_id = ?
    `;
    const params = [req.userId];

    if (subject_id) {
      sql += ' AND t.subject_id = ?';
      params.push(Number(subject_id));
    }
    if (task_type && VALID_TYPES.includes(task_type)) {
      sql += ' AND t.task_type = ?';
      params.push(task_type);
    }
    if (priority && VALID_PRIORITIES.includes(priority)) {
      sql += ' AND t.priority = ?';
      params.push(priority);
    }
    if (status && VALID_STATUSES.includes(status)) {
      sql += ' AND t.status = ?';
      params.push(status);
    }
    if (search && search.trim()) {
      sql += ' AND (t.title LIKE ? OR t.description LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    // Default sorting: due_date ASC, then priority
    if (sort === 'planned_date') {
      sql += ' ORDER BY t.planned_date ASC, t.priority DESC';
    } else {
      sql += ' ORDER BY t.due_date ASC, t.priority DESC, t.task_id DESC';
    }

    const rows = await query(sql, params);
    const tasks = rows.map(r => ({
      ...r,
      estimated_hours: Number(r.estimated_hours)
    }));

    res.json({ tasks });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/tasks
 * Create a new academic task
 */
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      subject_id,
      task_type,
      due_date,
      planned_date,
      estimated_hours,
      priority,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Validation error', message: 'Task title is required.' });
    }
    if (!subject_id) {
      return res.status(400).json({ error: 'Validation error', message: 'Subject selection is required.' });
    }
    if (!due_date) {
      return res.status(400).json({ error: 'Validation error', message: 'Submission due date is required.' });
    }
    if (!planned_date) {
      return res.status(400).json({ error: 'Validation error', message: 'Planned study date is required.' });
    }

    const cleanType = VALID_TYPES.includes(task_type) ? task_type : 'Assignment';
    const cleanPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const cleanStatus = VALID_STATUSES.includes(status) ? status : 'Pending';
    const hours = Number(estimated_hours) > 0 ? Number(estimated_hours) : 1.00;

    // Verify subject ownership
    const subRows = await query('SELECT subject_id, subject_name, subject_code FROM subjects WHERE subject_id = ? AND user_id = ?', [subject_id, req.userId]);
    if (subRows.length === 0) {
      return res.status(400).json({ error: 'Validation error', message: 'Selected subject does not exist or does not belong to your account.' });
    }

    const result = await query(
      `INSERT INTO tasks (
        user_id, subject_id, title, description, task_type,
        due_date, planned_date, estimated_hours, priority, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.userId,
        Number(subject_id),
        title.trim(),
        description ? description.trim() : null,
        cleanType,
        due_date.substring(0, 10),
        planned_date.substring(0, 10),
        hours,
        cleanPriority,
        cleanStatus
      ]
    );

    const insertedId = result.insertId;
    res.status(201).json({
      success: true,
      message: 'Task created successfully.',
      task: {
        task_id: insertedId,
        user_id: req.userId,
        subject_id: Number(subject_id),
        subject_name: subRows[0].subject_name,
        subject_code: subRows[0].subject_code,
        title: title.trim(),
        description: description ? description.trim() : null,
        task_type: cleanType,
        due_date: due_date.substring(0, 10),
        planned_date: planned_date.substring(0, 10),
        estimated_hours: hours,
        priority: cleanPriority,
        status: cleanStatus
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/tasks/:id
 * Update an existing task
 */
router.put('/:id', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const {
      title,
      description,
      subject_id,
      task_type,
      due_date,
      planned_date,
      estimated_hours,
      priority,
      status
    } = req.body;

    // Ownership check
    const existing = await query('SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const hours = Number(estimated_hours) > 0 ? Number(estimated_hours) : 1.00;
    const cleanType = VALID_TYPES.includes(task_type) ? task_type : 'Assignment';
    const cleanPriority = VALID_PRIORITIES.includes(priority) ? priority : 'Medium';
    const cleanStatus = VALID_STATUSES.includes(status) ? status : 'Pending';

    await query(
      `UPDATE tasks SET 
        title = ?,
        description = ?,
        subject_id = ?,
        task_type = ?,
        due_date = ?,
        planned_date = ?,
        estimated_hours = ?,
        priority = ?,
        status = ?
      WHERE task_id = ? AND user_id = ?`,
      [
        title.trim(),
        description ? description.trim() : null,
        Number(subject_id),
        cleanType,
        due_date.substring(0, 10),
        planned_date.substring(0, 10),
        hours,
        cleanPriority,
        cleanStatus,
        taskId,
        req.userId
      ]
    );

    res.json({ success: true, message: 'Task updated successfully.' });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/tasks/:id/status
 * Mark task status (Pending, In Progress, Completed)
 */
router.patch('/:id/status', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value.' });
    }

    const rows = await query('SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await query('UPDATE tasks SET status = ? WHERE task_id = ? AND user_id = ?', [status, taskId, req.userId]);
    res.json({ success: true, message: `Status updated to ${status}.` });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const taskId = Number(req.params.id);
    const rows = await query('SELECT task_id FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    await query('DELETE FROM tasks WHERE task_id = ? AND user_id = ?', [taskId, req.userId]);
    res.json({ success: true, message: 'Task deleted successfully.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
