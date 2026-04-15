import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import { vi } from 'vitest';
import { getAuth, clerkClient } from '@clerk/express';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;

const DEFAULT_CLERK_USER_ID = 'user_test_clerk_123';
const DEFAULT_EMAIL = 'signup@test.com';

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });
}, 60_000);

afterEach(async () => {
  await getPrismaClient().user.deleteMany();
});

afterAll(async () => {
  await disconnectPrisma();
  await container.stop();
});

describe('POST /signup', () => {
  it('returns 401 when the request has no valid Clerk token', async () => {
    vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: false } as any);

    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: DEFAULT_CLERK_USER_ID, email: DEFAULT_EMAIL });

    expect(res.status).toBe(401);
    expect(res.body).toMatchObject({ success: false, error: 'Unauthorized' });
  });

  it('returns 400 when the request body is invalid', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: '', email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 when clerkUserId in the body does not match the token', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: 'different_clerk_id', email: DEFAULT_EMAIL });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: 'Forbidden' });
  });

  it('returns 403 when the email in the body does not match the Clerk primary email', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: DEFAULT_CLERK_USER_ID, email: 'wrong@email.com' });

    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: 'Forbidden' });
  });

  it('returns 201 with the new user on first signup', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: DEFAULT_CLERK_USER_ID, email: DEFAULT_EMAIL, displayName: 'Alice' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        clerkUserId: DEFAULT_CLERK_USER_ID,
        email: DEFAULT_EMAIL,
        displayName: 'Alice',
      },
    });
    expect(res.body.data.id).toBeDefined();
  });

  it('returns 200 with the existing user and does not overwrite data when the user already exists', async () => {
    await getPrismaClient().user.create({
      data: { clerkUserId: DEFAULT_CLERK_USER_ID, email: DEFAULT_EMAIL, displayName: 'Original' },
    });

    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: DEFAULT_CLERK_USER_ID, email: DEFAULT_EMAIL, displayName: 'Updated' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      success: true,
      data: {
        clerkUserId: DEFAULT_CLERK_USER_ID,
        email: DEFAULT_EMAIL,
        displayName: 'Original',
      },
    });
  });

  it('calls clerkClient.users.getUser with the authenticated user ID', async () => {
    const res = await request(app)
      .post('/signup')
      .send({ clerkUserId: DEFAULT_CLERK_USER_ID, email: DEFAULT_EMAIL });

    expect(res.status).toBe(201);
    expect(vi.mocked(clerkClient.users.getUser)).toHaveBeenCalledWith(DEFAULT_CLERK_USER_ID);
  });
});
