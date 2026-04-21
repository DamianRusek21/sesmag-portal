require('dotenv').config();

const bcrypt = require('bcryptjs');
const pool = require('./db/db');

async function seed() {
  try {
    const employeePassword = await bcrypt.hash('password123', 10);
    const managerPassword = await bcrypt.hash('password123', 10);
    const adminPassword = await bcrypt.hash('password123', 10);

    const employee = await pool.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Damian Rusek', 'damian@example.com', employeePassword, 'employee']
    );

    const manager = await pool.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Sarah Manager', 'manager@example.com', managerPassword, 'manager']
    );

    const admin = await pool.query(
      `INSERT INTO users (full_name, email, password, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      ['Alex Admin', 'admin@example.com', adminPassword, 'admin']
    );

    await pool.query(
      `INSERT INTO profiles (user_id, phone, department, job_title, bio, location, public_info, private_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        employee.rows[0].id,
        '555-123-4567',
        'Data Analytics',
        'Data Scientist',
        'Computer Science student focused on data science and analytics.',
        'NJ',
        'Interested in dashboards and predictive modeling.',
        'Emergency contact: Mike Fin'
      ]
    );

    await pool.query(
      `INSERT INTO profiles (user_id, phone, department, job_title, bio, location, public_info, private_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        manager.rows[0].id,
        '555-987-6543',
        'Management',
        'HR Manager',
        'Reviews employee profile updates and manages team records.',
        'Newark, NJ',
        'HR lead for employee systems.',
        'Manager notes'
      ]
    );

    await pool.query(
      `INSERT INTO profiles (user_id, phone, department, job_title, bio, location, public_info, private_info)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        admin.rows[0].id,
        '555-333-2222',
        'Administration',
        'System Admin',
        'Oversees the HR portal and system settings.',
        'Union, NJ',
        'Platform administration and audit oversight.',
        'Admin notes'
      ]
    );

    await pool.query(
      `INSERT INTO activity_logs (user_id, action_type, description)
       VALUES
       ($1, 'seed', 'Seeded employee account'),
       ($2, 'seed', 'Seeded manager account'),
       ($3, 'seed', 'Seeded admin account')`,
      [employee.rows[0].id, manager.rows[0].id, admin.rows[0].id]
    );

    console.log('Seed complete');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();