const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/subjects
 * Retrieve all subjects with aggregated task statistics
 */
router.get('/', async (req, res, next) => {
  try {
    const sql = `
      SELECT 
        s.subject_id,
        s.subject_name,
        s.subject_code,
        s.created_at,
        COUNT(t.task_id) AS total_tasks,
        COUNT(CASE WHEN t.status != 'Completed' THEN 1 END) AS pending_tasks,
        COUNT(CASE WHEN t.status = 'Completed' THEN 1 END) AS completed_tasks,
        COALESCE(SUM(CASE WHEN t.status != 'Completed' THEN t.estimated_hours ELSE 0 END), 0) AS pending_hours,
        MIN(CASE WHEN t.status != 'Completed' THEN t.due_date END) AS next_deadline
      FROM subjects s
      LEFT JOIN tasks t ON s.subject_id = t.subject_id AND t.user_id = s.user_id
      WHERE s.user_id = ?
      GROUP BY s.subject_id
      ORDER BY s.subject_name ASC
    `;

    const rows = await query(sql, [req.userId]);
    const subjects = rows.map(r => ({
      ...r,
      total_tasks: Number(r.total_tasks),
      pending_tasks: Number(r.pending_tasks),
      completed_tasks: Number(r.completed_tasks),
      pending_hours: Number(Number(r.pending_hours).toFixed(2))
    }));

    res.json({
      success: true,
      message: 'Subjects retrieved successfully.',
      subjects,
      data: { subjects }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/subjects
 * Create a new subject
 */
router.post('/', async (req, res, next) => {
  try {
    const { subject_name, subject_code } = req.body;

    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Subject name is required.'
      });
    }
    if (!subject_code || !subject_code.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Subject code is required (e.g. CS301).'
      });
    }

    const cleanName = subject_name.trim();
    const cleanCode = subject_code.trim().toUpperCase();

    // Check duplicate code for this user
    const existing = await query(
      'SELECT subject_id FROM subjects WHERE user_id = ? AND subject_code = ?',
      [req.userId, cleanCode]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_CODE',
        message: `You already have a subject with code ${cleanCode}.`
      });
    }

    const result = await query(
      'INSERT INTO subjects (user_id, subject_name, subject_code) VALUES (?, ?, ?)',
      [req.userId, cleanName, cleanCode]
    );

    const newSubject = {
      subject_id: result.insertId,
      subject_name: cleanName,
      subject_code: cleanCode,
      total_tasks: 0,
      pending_tasks: 0,
      completed_tasks: 0,
      pending_hours: 0,
      next_deadline: null
    };

    res.status(201).json({
      success: true,
      message: 'Subject added successfully.',
      subject: newSubject,
      data: { subject: newSubject }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/subjects/:id
 * Update subject details
 */
router.put('/:id', async (req, res, next) => {
  try {
    const subjectId = Number(req.params.id);
    const { subject_name, subject_code } = req.body;

    if (!subject_name || !subject_name.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Subject name is required.'
      });
    }
    if (!subject_code || !subject_code.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Subject code is required.'
      });
    }

    // Verify ownership
    const rows = await query('SELECT subject_id FROM subjects WHERE subject_id = ? AND user_id = ?', [subjectId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Subject not found.'
      });
    }

    const cleanName = subject_name.trim();
    const cleanCode = subject_code.trim().toUpperCase();

    // Check duplicate code excluding current
    const duplicate = await query(
      'SELECT subject_id FROM subjects WHERE user_id = ? AND subject_code = ? AND subject_id != ?',
      [req.userId, cleanCode, subjectId]
    );
    if (duplicate.length > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_CODE',
        message: `Subject code ${cleanCode} is already in use.`
      });
    }

    await query(
      'UPDATE subjects SET subject_name = ?, subject_code = ? WHERE subject_id = ? AND user_id = ?',
      [cleanName, cleanCode, subjectId, req.userId]
    );

    const updated = { subject_id: subjectId, subject_name: cleanName, subject_code: cleanCode };

    res.json({
      success: true,
      message: 'Subject updated successfully.',
      subject: updated,
      data: { subject: updated }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/subjects/:id
 * Safe delete: Refuses if tasks are associated with this subject
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const subjectId = Number(req.params.id);

    // Verify ownership
    const rows = await query('SELECT subject_id, subject_name FROM subjects WHERE subject_id = ? AND user_id = ?', [subjectId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Subject not found.'
      });
    }

    // Check if any tasks exist for this subject
    const taskCountRows = await query('SELECT COUNT(*) AS count FROM tasks WHERE subject_id = ? AND user_id = ?', [subjectId, req.userId]);
    const taskCount = Number(taskCountRows[0].count);

    if (taskCount > 0) {
      return res.status(409).json({
        success: false,
        errorCode: 'ASSOCIATED_TASKS_EXIST',
        message: `This subject has ${taskCount} associated task${taskCount === 1 ? '' : 's'}. You must delete or reassign its tasks before deleting the subject.`,
        task_count: taskCount,
        data: { task_count: taskCount }
      });
    }

    await query('DELETE FROM subjects WHERE subject_id = ? AND user_id = ?', [subjectId, req.userId]);
    res.json({
      success: true,
      message: 'Subject deleted successfully.',
      data: {}
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
