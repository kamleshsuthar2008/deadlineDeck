const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/notes
 * Retrieve notes for authenticated user, sorted by is_pinned DESC, updated_at DESC
 */
router.get('/', async (req, res, next) => {
  try {
    const { subject_id, search } = req.query;

    let sql = `
      SELECT 
        n.note_id,
        n.subject_id,
        s.subject_name,
        s.subject_code,
        n.title,
        n.content,
        n.is_pinned,
        n.created_at,
        n.updated_at
      FROM notes n
      LEFT JOIN subjects s ON n.subject_id = s.subject_id
      WHERE n.user_id = ?
    `;
    const params = [req.userId];

    if (subject_id) {
      sql += ' AND n.subject_id = ?';
      params.push(Number(subject_id));
    }
    if (search && search.trim()) {
      sql += ' AND (n.title LIKE ? OR n.content LIKE ?)';
      const term = `%${search.trim()}%`;
      params.push(term, term);
    }

    sql += ' ORDER BY n.is_pinned DESC, n.updated_at DESC';

    const rows = await query(sql, params);
    const notes = rows.map(r => ({
      ...r,
      is_pinned: Boolean(r.is_pinned)
    }));

    res.json({
      success: true,
      message: 'Notes retrieved successfully.',
      notes,
      data: { notes }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/notes
 * Create a new note
 */
router.post('/', async (req, res, next) => {
  try {
    const { subject_id, title, content, is_pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Note title is required.'
      });
    }

    const subId = subject_id ? Number(subject_id) : null;
    const pinned = is_pinned ? 1 : 0;

    const result = await query(
      'INSERT INTO notes (user_id, subject_id, title, content, is_pinned) VALUES (?, ?, ?, ?, ?)',
      [req.userId, subId, title.trim(), content ? content.trim() : null, pinned]
    );

    const newNote = {
      note_id: result.insertId,
      subject_id: subId,
      title: title.trim(),
      content: content ? content.trim() : null,
      is_pinned: Boolean(pinned)
    };

    res.status(201).json({
      success: true,
      message: 'Note saved successfully.',
      note: newNote,
      data: { note: newNote }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/notes/:id
 * Update an existing note
 */
router.put('/:id', async (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const { subject_id, title, content, is_pinned } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Note title is required.'
      });
    }

    const rows = await query('SELECT note_id FROM notes WHERE note_id = ? AND user_id = ?', [noteId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Note not found.'
      });
    }

    const subId = subject_id ? Number(subject_id) : null;
    const pinned = is_pinned ? 1 : 0;

    await query(
      'UPDATE notes SET subject_id = ?, title = ?, content = ?, is_pinned = ? WHERE note_id = ? AND user_id = ?',
      [subId, title.trim(), content ? content.trim() : null, pinned, noteId, req.userId]
    );

    const updatedNote = {
      note_id: noteId,
      subject_id: subId,
      title: title.trim(),
      content: content ? content.trim() : null,
      is_pinned: Boolean(pinned)
    };

    res.json({
      success: true,
      message: 'Note updated successfully.',
      note: updatedNote,
      data: { note: updatedNote }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/notes/:id/pin
 * Toggle note pin status
 */
router.patch('/:id/pin', async (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const rows = await query('SELECT note_id, is_pinned FROM notes WHERE note_id = ? AND user_id = ?', [noteId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Note not found.'
      });
    }

    const newPinned = rows[0].is_pinned ? 0 : 1;
    await query('UPDATE notes SET is_pinned = ? WHERE note_id = ? AND user_id = ?', [newPinned, noteId, req.userId]);

    res.json({
      success: true,
      message: newPinned ? 'Note pinned.' : 'Note unpinned.',
      is_pinned: Boolean(newPinned),
      data: { note_id: noteId, is_pinned: Boolean(newPinned) }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/notes/:id
 * Delete note
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const noteId = Number(req.params.id);
    const rows = await query('SELECT note_id FROM notes WHERE note_id = ? AND user_id = ?', [noteId, req.userId]);
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Note not found.'
      });
    }

    await query('DELETE FROM notes WHERE note_id = ? AND user_id = ?', [noteId, req.userId]);
    res.json({
      success: true,
      message: 'Note deleted successfully.',
      data: { note_id: noteId }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
