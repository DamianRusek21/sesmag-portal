const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

router.use(authenticateToken, authorizeRoles('manager', 'admin'));

router.get('/changes', async (req, res) => {
  try {
    let result;

    if (req.user.role === 'manager') {
      result = await pool.query(`
        SELECT change_requests.*, users.full_name, users.role AS requester_role
        FROM change_requests
        JOIN users ON change_requests.user_id = users.id
        WHERE users.role = 'employee'
        ORDER BY change_requests.requested_at DESC
      `);
    } else {
      result = await pool.query(`
        SELECT change_requests.*, users.full_name, users.role AS requester_role
        FROM change_requests
        JOIN users ON change_requests.user_id = users.id
        ORDER BY change_requests.requested_at DESC
      `);
    }

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch change requests' });
  }
});

router.put('/changes/:id/approve', async (req, res) => {
  try {
    const changeResult = await pool.query(
      `
      SELECT change_requests.*, users.full_name, users.role AS requester_role
      FROM change_requests
      JOIN users ON change_requests.user_id = users.id
      WHERE change_requests.id = $1
      `,
      [req.params.id]
    );

    if (changeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const change = changeResult.rows[0];

    if (change.status !== 'pending') {
      return res.status(400).json({ error: 'Change request already reviewed' });
    }

    if (change.user_id === req.user.id) {
      return res.status(403).json({ error: 'Managers cannot approve their own requests' });
    }

    if (req.user.role === 'manager' && change.requester_role !== 'employee') {
      return res.status(403).json({ error: 'Managers can only review employee requests' });
    }

    const allowedFields = [
      'phone',
      'department',
      'job_title',
      'bio',
      'location',
      'public_info',
      'private_info'
    ];

    if (!allowedFields.includes(change.field_name)) {
      return res.status(400).json({ error: 'Invalid field name' });
    }

    const fieldMap = {
      phone: 'phone',
      department: 'department',
      job_title: 'job_title',
      bio: 'bio',
      location: 'location',
      public_info: 'public_info',
      private_info: 'private_info'
    };

    const fieldName = fieldMap[change.field_name];

    await pool.query(
      `
      UPDATE profiles
      SET ${fieldName} = $1, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $2
      `,
      [change.new_value, change.user_id]
    );

    await pool.query(
      `
      UPDATE change_requests
      SET status = 'approved', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [req.user.id, req.params.id]
    );

    await logActivity(
      req.user.id,
      'approve_change_request',
      `${req.user.full_name} approved change request #${req.params.id}`
    );

    res.json({ message: 'Change request approved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to approve change request' });
  }
});

router.put('/changes/:id/reject', async (req, res) => {
  try {
    const requestInfo = await pool.query(
      `
      SELECT change_requests.*, users.full_name, users.role AS requester_role
      FROM change_requests
      JOIN users ON change_requests.user_id = users.id
      WHERE change_requests.id = $1
      `,
      [req.params.id]
    );

    if (requestInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Change request not found' });
    }

    const change = requestInfo.rows[0];

    if (change.status !== 'pending') {
      return res.status(400).json({ error: 'Change request already reviewed' });
    }

    if (change.user_id === req.user.id) {
      return res.status(403).json({ error: 'Managers cannot reject their own requests' });
    }

    if (req.user.role === 'manager' && change.requester_role !== 'employee') {
      return res.status(403).json({ error: 'Managers can only review employee requests' });
    }

    await pool.query(
      `
      UPDATE change_requests
      SET status = 'rejected', reviewed_by = $1, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = $2
      `,
      [req.user.id, req.params.id]
    );

    await logActivity(
      req.user.id,
      'reject_change_request',
      `${req.user.full_name} rejected change request #${req.params.id}`
    );

    res.json({ message: 'Change request rejected' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to reject change request' });
  }
});

router.get('/dashboard', async (req, res) => {
  try {
    const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
    const totalEmployees = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'employee'`);
    const totalManagers = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'manager'`);
    const totalAdmins = await pool.query(`SELECT COUNT(*) FROM users WHERE role = 'admin'`);
    const pendingRequests = await pool.query(`SELECT COUNT(*) FROM change_requests WHERE status = 'pending'`);
    const approvedRequests = await pool.query(`SELECT COUNT(*) FROM change_requests WHERE status = 'approved'`);
    const rejectedRequests = await pool.query(`SELECT COUNT(*) FROM change_requests WHERE status = 'rejected'`);

    res.json({
      total_users: Number(totalUsers.rows[0].count),
      total_employees: Number(totalEmployees.rows[0].count),
      total_managers: Number(totalManagers.rows[0].count),
      total_admins: Number(totalAdmins.rows[0].count),
      pending_requests: Number(pendingRequests.rows[0].count),
      approved_requests: Number(approvedRequests.rows[0].count),
      rejected_requests: Number(rejectedRequests.rows[0].count)
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch dashboard data' });
  }
});

router.get('/chart-data', async (req, res) => {
  try {
    const usersByDepartment = await pool.query(`
      SELECT department, COUNT(*)::int AS count
      FROM profiles
      GROUP BY department
      ORDER BY department
    `);

    const roleDistribution = await pool.query(`
      SELECT role, COUNT(*)::int AS count
      FROM users
      GROUP BY role
      ORDER BY role
    `);

    const requestStatusDistribution = await pool.query(`
      SELECT status, COUNT(*)::int AS count
      FROM change_requests
      GROUP BY status
      ORDER BY status
    `);

    res.json({
      users_by_department: usersByDepartment.rows,
      role_distribution: roleDistribution.rows,
      request_status_distribution: requestStatusDistribution.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch chart data' });
  }
});

router.get('/activity-logs', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view activity logs' });
    }

    const result = await pool.query(`
      SELECT activity_logs.*, users.full_name, users.role
      FROM activity_logs
      LEFT JOIN users ON activity_logs.user_id = users.id
      ORDER BY activity_logs.created_at DESC
    `);

    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch activity logs' });
  }
});

router.get('/database-overview', async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can view database overview' });
    }

    const totalUsers = await pool.query(`SELECT COUNT(*)::int AS count FROM users`);
    const totalProfiles = await pool.query(`SELECT COUNT(*)::int AS count FROM profiles`);
    const totalChangeRequests = await pool.query(`SELECT COUNT(*)::int AS count FROM change_requests`);
    const totalActivityLogs = await pool.query(`SELECT COUNT(*)::int AS count FROM activity_logs`);

    const recentChangeRequests = await pool.query(`
      SELECT change_requests.id, users.full_name, users.role AS requester_role,
             change_requests.field_name, change_requests.status, change_requests.requested_at
      FROM change_requests
      JOIN users ON change_requests.user_id = users.id
      ORDER BY change_requests.requested_at DESC
      LIMIT 5
    `);

    const recentActivityLogs = await pool.query(`
      SELECT activity_logs.id, users.full_name, activity_logs.action_type,
             activity_logs.description, activity_logs.created_at
      FROM activity_logs
      LEFT JOIN users ON activity_logs.user_id = users.id
      ORDER BY activity_logs.created_at DESC
      LIMIT 5
    `);

    res.json({
      totals: {
        users: totalUsers.rows[0].count,
        profiles: totalProfiles.rows[0].count,
        change_requests: totalChangeRequests.rows[0].count,
        activity_logs: totalActivityLogs.rows[0].count
      },
      recent_change_requests: recentChangeRequests.rows,
      recent_activity_logs: recentActivityLogs.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch database overview' });
  }
});

module.exports = router;