const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT profiles.*, users.full_name, users.email, users.role
      FROM profiles
      JOIN users ON profiles.user_id = users.id
      WHERE profiles.user_id = $1
      `,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.get('/', authenticateToken, authorizeRoles('manager', 'admin'), async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT profiles.*, users.full_name, users.email, users.role
      FROM profiles
      JOIN users ON profiles.user_id = users.id
      ORDER BY profiles.id
      `
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// Employee/admin/manager can view their own submitted requests
router.get('/my-requests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT change_requests.*, reviewer.full_name AS reviewer_name
      FROM change_requests
      LEFT JOIN users AS reviewer ON change_requests.reviewed_by = reviewer.id
      WHERE change_requests.user_id = $1
      ORDER BY change_requests.requested_at DESC
      `,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch request history' });
  }
});

router.post('/request-change', authenticateToken, async (req, res) => {
  try {
    const allowedFields = [
      'phone',
      'department',
      'job_title',
      'bio',
      'location',
      'public_info',
      'private_info'
    ];

    const profileResult = await pool.query(
      'SELECT * FROM profiles WHERE user_id = $1',
      [req.user.id]
    );

    if (profileResult.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    const currentProfile = profileResult.rows[0];
    const submittedFields = req.body;
    let insertedCount = 0;

    for (const field of allowedFields) {
      if (
        Object.prototype.hasOwnProperty.call(submittedFields, field) &&
        submittedFields[field] !== currentProfile[field]
      ) {
        await pool.query(
          `
          INSERT INTO change_requests (user_id, field_name, old_value, new_value)
          VALUES ($1, $2, $3, $4)
          `,
          [
            req.user.id,
            field,
            currentProfile[field] || '',
            submittedFields[field] || ''
          ]
        );
        insertedCount += 1;
      }
    }

    if (insertedCount === 0) {
      return res.json({ message: 'No changes were submitted because no fields were different.' });
    }

    await logActivity(
      req.user.id,
      'submit_change_request',
      `${req.user.full_name} submitted ${insertedCount} change request(s)`
    );

    res.json({ message: 'Change request(s) submitted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to submit change requests' });
  }
});

module.exports = router;