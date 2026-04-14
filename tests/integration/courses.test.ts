import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;
let courseId: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  // User matching the Clerk mock in tests/setup.ts
  const videoUser = await getPrismaClient().user.create({
    data: { clerkUserId: 'user_test_clerk_123', email: 'videouser@test.com' },
  });

  await getPrismaClient().video.createMany({
    data: [
      { id: 'v1', title: 'Video One', url: 'https://example.com/v1', thumbnail: 'https://example.com/v1.jpg' },
      { id: 'v2', title: 'Video Two', url: 'https://example.com/v2', thumbnail: 'https://example.com/v2.jpg' },
      { id: 'v3', title: 'Video Three', url: 'https://example.com/v3', thumbnail: 'https://example.com/v3.jpg' },
    ],
  });

  const course = await getPrismaClient().course.create({
    data: { title: 'Test Course', description: 'A test course', isPublished: true, sortOrder: 1 },
  });
  courseId = course.id;

  await getPrismaClient().courseVideo.createMany({
    data: [
      { courseId, videoId: 'v1', position: 1 },
      { courseId, videoId: 'v2', position: 2 },
      { courseId, videoId: 'v3', position: 3 },
    ],
  });

  // v1: watched, v2: in-progress, v3: no entry (defaults to unwatched/0)
  await getPrismaClient().userVideoProgress.createMany({
    data: [
      { userId: videoUser.id, videoId: 'v1', watched: true, progressSecs: 0 },
      { userId: videoUser.id, videoId: 'v2', watched: false, progressSecs: 120 },
    ],
  });
}, 60_000);

afterAll(async () => {
  await getPrismaClient().userVideoProgress.deleteMany();
  await getPrismaClient().courseVideo.deleteMany();
  await getPrismaClient().planCourse.deleteMany();
  await getPrismaClient().subscription.deleteMany();
  await getPrismaClient().video.deleteMany();
  await getPrismaClient().course.deleteMany();
  await getPrismaClient().plan.deleteMany();
  await getPrismaClient().user.deleteMany();
  await disconnectPrisma();
  await container.stop();
});

describe('GET /courses', () => {
  it('returns 200 with a list of published courses and pagination metadata', async () => {
    const res = await request(app).get('/courses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toMatchObject({
      id: expect.any(String),
      title: 'Test Course',
      description: 'A test course',
      sortOrder: 1,
    });
    expect(res.body.pagination).toMatchObject({
      total: expect.any(Number),
      limit: expect.any(Number),
      offset: 0,
      hasMore: false,
    });
  });

  it('does not return unpublished courses', async () => {
    await getPrismaClient().course.create({
      data: { title: 'Hidden Course', isPublished: false, sortOrder: 99 },
    });

    const res = await request(app).get('/courses');

    expect(res.status).toBe(200);
    expect(res.body.data.every((c: { title: string }) => c.title !== 'Hidden Course')).toBe(true);
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get('/courses?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /courses/:id', () => {
  it('returns 200 with the correct course', async () => {
    const res = await request(app).get(`/courses/${courseId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: courseId,
      title: 'Test Course',
      description: 'A test course',
      sortOrder: 1,
    });
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const res = await request(app).get('/courses/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Course not found');
  });

  it('returns 400 for an invalid UUID format', async () => {
    const res = await request(app).get('/courses/not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid course ID format');
  });
});

describe('GET /courses/:id/videos', () => {
  it('returns 200 with videos in position order and per-user progress', async () => {
    const res = await request(app).get(`/courses/${courseId}/videos`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject([
      { id: 'v1', title: 'Video One', url: 'https://example.com/v1', thumbnail: 'https://example.com/v1.jpg', watched: true, progressSecs: 0 },
      { id: 'v2', title: 'Video Two', url: 'https://example.com/v2', thumbnail: 'https://example.com/v2.jpg', watched: false, progressSecs: 120 },
      { id: 'v3', title: 'Video Three', url: 'https://example.com/v3', thumbnail: 'https://example.com/v3.jpg', watched: false, progressSecs: 0 },
    ]);
    expect(res.body.pagination).toMatchObject({
      total: 3,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get(`/courses/${courseId}/videos?limit=1&offset=1`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject([
      { id: 'v2', watched: false, progressSecs: 120 },
    ]);
    expect(res.body.pagination).toMatchObject({
      total: 3,
      limit: 1,
      offset: 1,
      hasMore: true,
    });
  });

  it('returns 400 for an invalid course UUID', async () => {
    const res = await request(app).get('/courses/not-a-uuid/videos');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid course ID format');
  });
});
