const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/checklists
 * Retrieve checklists with items and completion percentage
 */
router.get('/', async (req, res, next) => {
  try {
    const listSql = `
      SELECT 
        c.checklist_id,
        c.task_id,
        t.title AS task_title,
        c.title,
        c.created_at
      FROM checklists c
      LEFT JOIN tasks t ON c.task_id = t.task_id AND t.user_id = c.user_id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
    `;
    const checklists = await query(listSql, [req.userId]);

    if (checklists.length === 0) {
      return res.json({ checklists: [] });
    }

    const ids = checklists.map(c => c.checklist_id);
    const placeholders = ids.map(() => '?').join(',');
    const itemsSql = `
      SELECT 
        item_id,
        checklist_id,
        item_text,
        is_completed,
        sort_order
      FROM checklist_items
      WHERE checklist_id IN (${placeholders})
      ORDER BY sort_order ASC, item_id ASC
    `;
    const items = await query(itemsSql, ids);

    // Group items into checklists
    const itemsMap = {};
    for (const item of items) {
      if (!itemsMap[item.checklist_id]) itemsMap[item.checklist_id] = [];
      itemsMap[item.checklist_id].push({
        ...item,
        is_completed: Boolean(item.is_completed)
      });
    }

    const results = checklists.map(c => {
      const cItems = itemsMap[c.checklist_id] || [];
      const totalItems = cItems.length;
      const completedItems = cItems.filter(i => i.is_completed).length;
      const percentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

      return {
        ...c,
        total_items: totalItems,
        completed_items: completedItems,
        completion_percentage: percentage,
        items: cItems
      };
    });

    res.json({ checklists: results });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/checklists
 * Create a new checklist
 */
router.post('/', async (req, res, next) => {
  try {
    const { title, task_id } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Checklist title is required.' });
    }

    const taskId = task_id ? Number(task_id) : null;
    const result = await query(
      'INSERT INTO checklists (user_id, task_id, title) VALUES (?, ?, ?)',
      [req.userId, taskId, title.trim()]
    );

    res.status(201).json({
      success: true,
      message: 'Checklist created.',
      checklist: {
        checklist_id: result.insertId,
        task_id: taskId,
        title: title.trim(),
        total_items: 0,
        completed_items: 0,
        completion_percentage: 0,
        items: []
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/checklists/:id/items
 * Add an item to a checklist
 */
router.post('/:id/items', async (req, res, next) => {
  try {
    const checklistId = Number(req.params.id);
    const { item_text } = req.body;

    if (!item_text || !item_text.trim()) {
      return res.status(400).json({ error: 'Item description cannot be empty.' });
    }

    // Ownership check
    const rows = await query('SELECT checklist_id FROM checklists WHERE checklist_id = ? AND user_id = ?', [checklistId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Checklist not found.' });

    const maxOrderRows = await query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM checklist_items WHERE checklist_id = ?', [checklistId]);
    const nextOrder = maxOrderRows[0].next_order;

    const result = await query(
      'INSERT INTO checklist_items (checklist_id, item_text, is_completed, sort_order) VALUES (?, ?, 0, ?)',
      [checklistId, item_text.trim(), nextOrder]
    );

    res.status(201).json({
      success: true,
      item: {
        item_id: result.insertId,
        checklist_id: checklistId,
        item_text: item_text.trim(),
        is_completed: false,
        sort_order: nextOrder
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/checklists/items/:item_id/toggle
 * Toggle completed state of an item
 */
router.patch('/items/:item_id/toggle', async (req, res, next) => {
  try {
    const itemId = Number(req.params.item_id);

    // Verify ownership via join with checklists
    const sql = `
      SELECT ci.item_id, ci.is_completed, ci.checklist_id 
      FROM checklist_items ci
      JOIN checklists c ON ci.checklist_id = c.checklist_id
      WHERE ci.item_id = ? AND c.user_id = ?
    `;
    const rows = await query(sql, [itemId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found.' });

    const newStatus = rows[0].is_completed ? 0 : 1;
    await query('UPDATE checklist_items SET is_completed = ? WHERE item_id = ?', [newStatus, itemId]);

    res.json({ success: true, is_completed: Boolean(newStatus) });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/checklists/items/:item_id
 * Delete an item
 */
router.delete('/items/:item_id', async (req, res, next) => {
  try {
    const itemId = Number(req.params.item_id);
    const sql = `
      SELECT ci.item_id 
      FROM checklist_items ci
      JOIN checklists c ON ci.checklist_id = c.checklist_id
      WHERE ci.item_id = ? AND c.user_id = ?
    `;
    const rows = await query(sql, [itemId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Item not found.' });

    await query('DELETE FROM checklist_items WHERE item_id = ?', [itemId]);
    res.json({ success: true, message: 'Item deleted.' });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/checklists/:id
 * Delete whole checklist and cascade items
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const checklistId = Number(req.params.id);
    const rows = await query('SELECT checklist_id FROM checklists WHERE checklist_id = ? AND user_id = ?', [checklistId, req.userId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Checklist not found.' });

    await query('DELETE FROM checklists WHERE checklist_id = ? AND user_id = ?', [checklistId, req.userId]);
    res.json({ success: true, message: 'Checklist deleted.' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
