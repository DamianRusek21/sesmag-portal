const express = require('express');
const router = express.Router();
const pool = require('../db/db');

// GET all change requests with employee name
router.get('/changes', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT change_requests.*, users.full_name
      FROM change_requests
      JOIN users ON change_requests.user_id = users.id
      ORDER BY change_requests.id
    `);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
});

module.exports = router;