const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

router.get('/', authenticateToken, authorizeRoles('manager', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, created_at FROM users ORDER BY id'
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Admin-only: update another user's role
router.put('/:id/role', authenticateToken, authorizeRoles('admin'), async (req, res) => {
  try {
    const { role } = req.body;
    const userId = Number(req.params.id);

    const allowedRoles = ['employee', 'manager'];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Allowed roles: employee, manager' });
    }

    const existingUser = await pool.query(
      'SELECT id, full_name, email, role FROM users WHERE id = $1',
      [userId]
    );

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const targetUser = existingUser.rows[0];

    // Prevent changing admins through this route
    if (targetUser.role === 'admin') {
      return res.status(403).json({ error: 'Admin accounts cannot be changed here' });
    }

    if (targetUser.id === req.user.id) {
      return res.status(403).json({ error: 'Admin cannot change their own role' });
    }

    const updated = await pool.query(
      `UPDATE users
       SET role = $1
       WHERE id = $2
       RETURNING id, full_name, email, role, created_at`,
      [role, userId]
    );

    await logActivity(
      req.user.id,
      'update_user_role',
      `${req.user.full_name} changed ${targetUser.full_name}'s role from ${targetUser.role} to ${role}`
    );

    res.json({
      message: 'User role updated successfully',
      user: updated.rows[0]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

module.exports = router;