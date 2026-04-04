import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();

  // Set DATABASE_URL before any Prisma call so the lazy singleton picks up
  // the test container connection string on first use.
  process.env.DATABASE_URL = container.getConnectionUri();

  // Apply migrations to the test container — this keeps the schema in sync
  // with the actual migration history rather than a separate SQL file.
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  // Seed the test database via Prisma so the data matches the seed script.
  await getPrismaClient().user.createMany({
    data: [
      { clerkUserId: 'clerk_user_alice',   email: 'alice@prisma.io',   displayName: 'Alice' },
      { clerkUserId: 'clerk_user_nilu',    email: 'nilu@prisma.io',    displayName: 'Nilu' },
      { clerkUserId: 'clerk_user_mahmoud', email: 'mahmoud@prisma.io', displayName: 'Mahmoud' },
    ],
  });
}, 60_000);

afterAll(async () => {
  await getPrismaClient().user.deleteMany();
  await disconnectPrisma();
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
  let existingUserId: string;

  beforeAll(async () => {
    const user = await getPrismaClient().user.findFirst();
    if (!user) throw new Error('No seed data found — check db/schema.sql/init.sql');
    existingUserId = user.id;
  });

  it('returns 200 with the correct user for a valid existing ID', async () => {
    const res = await request(app).get(`/users/${existingUserId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: existingUserId,
      clerkUserId: expect.any(String),
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
