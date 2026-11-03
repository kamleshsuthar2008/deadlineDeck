const express = require('express');
const router = express.Router();
const { query } = require('../config/db.js');
const { requireAuth } = require('../middleware/auth.js');

router.use(requireAuth);

/**
 * GET /api/capacity
 * Fetch default hours and all date-specific capacity overrides
 */
router.get('/', async (req, res, next) => {
  try {
    const userRows = await query('SELECT default_study_hours FROM users WHERE user_id = ?', [req.userId]);
    const defaultHours = Number(userRows[0]?.default_study_hours || 4.00);

    const overrideRows = await query(
      'SELECT capacity_id, capacity_date, available_hours FROM study_capacity WHERE user_id = ? ORDER BY capacity_date ASC',
      [req.userId]
    );

    const overrides = overrideRows.map(r => ({
      capacity_id: r.capacity_id,
      capacity_date: typeof r.capacity_date === 'string' ? r.capacity_date.substring(0, 10) : new Date(r.capacity_date).toISOString().substring(0, 10),
      available_hours: Number(r.available_hours)
    }));

    res.json({
      default_study_hours: defaultHours,
      overrides
    });
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/capacity/:date
 * Set or update date-specific available study hours override
 */
router.put('/:date', async (req, res, next) => {
  try {
    const dateStr = req.params.date.substring(0, 10);
    const { available_hours } = req.body;

    const hours = Number(available_hours);
    if (isNaN(hours) || hours < 0 || hours > 24) {
      return res.status(400).json({ error: 'Available hours must be a number between 0 and 24.' });
    }

    await query(
      `INSERT INTO study_capacity (user_id, capacity_date, available_hours)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE available_hours = VALUES(available_hours)`,
      [req.userId, dateStr, hours]
    );

    res.json({
      success: true,
      message: `Study capacity for ${dateStr} set to ${hours}h.`,
      capacity_date: dateStr,
      available_hours: hours
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/capacity/:date
 * Remove date-specific override (reverts to default)
 */
router.delete('/:date', async (req, res, next) => {
  try {
    const dateStr = req.params.date.substring(0, 10);
    await query('DELETE FROM study_capacity WHERE user_id = ? AND capacity_date = ?', [req.userId, dateStr]);

    res.json({
      success: true,
      message: `Date override removed for ${dateStr}. Reverted to default study capacity.`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
