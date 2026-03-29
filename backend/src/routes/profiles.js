const express = require('express');
const router = express.Router();
const pool = require('../db/db');

// GET all profiles with user info
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT profiles.*, users.full_name
      FROM profiles
      JOIN users ON profiles.user_id = users.id
      ORDER BY profiles.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
});

// GET one profile by user_id
router.get('/:userId', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT profiles.*, users.full_name
      FROM profiles
      JOIN users ON profiles.user_id = users.id
      WHERE profiles.user_id = $1
    `, [req.params.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// UPDATE one profile by user_id
router.put('/:userId', async (req, res) => {
  try {
    const {
      phone,
      department,
      job_title,
      bio,
      location,
      public_info,
      private_info
    } = req.body;

    const result = await pool.query(`
      UPDATE profiles
      SET phone = $1,
          department = $2,
          job_title = $3,
          bio = $4,
          location = $5,
          public_info = $6,
          private_info = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $8
      RETURNING *
    `, [
      phone,
      department,
      job_title,
      bio,
      location,
      public_info,
      private_info,
      req.params.userId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Profile not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;