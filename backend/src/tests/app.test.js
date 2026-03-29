const request = require('supertest');
const app = require('../app');
const pool = require('../db/db');

describe('API routes', () => {
  test('GET / should return server running message', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toBe(200);
    expect(res.text).toBe('Server running');
  });

  test('GET /api/users should return an array', async () => {
    const res = await request(app).get('/api/users');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/profiles should return an array', async () => {
    const res = await request(app).get('/api/profiles');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('GET /api/manager/changes should return an array', async () => {
    const res = await request(app).get('/api/manager/changes');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

afterAll(async () => {
  await pool.end();
});