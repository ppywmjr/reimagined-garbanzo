const { PostgreSqlContainer } = require('@testcontainers/postgresql');
const request = require('supertest');
const path = require('path');
const fs = require('fs');

let container;
let app;
let db;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();

  // Set DATABASE_URL before any app modules are required so the lazy pool
  // picks up the test container connection string
  process.env.DATABASE_URL = container.getConnectionUri();

  // Reset module cache so all requires below load fresh instances that use
  // the DATABASE_URL we just set
  jest.resetModules();
  app = require('../../app');
  db = require('../../db/client');

  const schema = fs.readFileSync(
    path.join(__dirname, '../../db/schema.sql/init.sql'),
    'utf8'
  );
  await db.query(schema);
}, 60_000);

afterAll(async () => {
  await db.end();
  await container.stop();
});

describe('GET /users', () => {
  it('returns 200 with a list of users and pagination metadata', async () => {
    const res = await request(app).get('/users');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: 0,
      hasMore: expect.any(Boolean),
    });
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get('/users?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
    expect(res.body.pagination.offset).toBe(0);
  });
});

describe('GET /users/:id', () => {
  let existingUserId;

  beforeAll(async () => {
    const result = await db.query('SELECT id FROM users LIMIT 1');
    existingUserId = result.rows[0].id;
  });

  it('returns 200 with the correct user for a valid existing ID', async () => {
    const res = await request(app).get(`/users/${existingUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: existingUserId,
      clerk_user_id: expect.any(String),
      email: expect.any(String),
    });
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const nonExistentId = '00000000-0000-0000-0000-000000000000';
    const res = await request(app).get(`/users/${nonExistentId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('User not found');
  });

  it('returns 400 for an invalid UUID format', async () => {
    const res = await request(app).get('/users/not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid user ID format');
  });
});
