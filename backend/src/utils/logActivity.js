const pool = require('../db/db');

async function logActivity(userId, actionType, description) {
  try {
    await pool.query(
      `INSERT INTO activity_logs (user_id, action_type, description)
       VALUES ($1, $2, $3)`,
      [userId || null, actionType, description]
    );
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

module.exports = logActivity;