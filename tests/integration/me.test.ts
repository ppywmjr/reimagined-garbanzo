import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;
let courseId: string;
let unsubscribedCourseId: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  // User matching the Clerk mock in tests/setup.ts
  const user = await getPrismaClient().user.create({
    data: { clerkUserId: 'user_test_clerk_123', email: 'meuser@test.com' },
  });

  await getPrismaClient().video.createMany({
    data: [
      { id: 'v1', title: 'Video One',   url: 'https://example.com/v1', thumbnail: 'https://example.com/v1.jpg' },
      { id: 'v2', title: 'Video Two',   url: 'https://example.com/v2', thumbnail: 'https://example.com/v2.jpg' },
      { id: 'v3', title: 'Video Three', url: 'https://example.com/v3', thumbnail: 'https://example.com/v3.jpg' },
    ],
  });

  const course = await getPrismaClient().course.create({
    data: { title: 'My Course', description: 'Subscribed course', isPublished: true, sortOrder: 1 },
  });
  courseId = course.id;

  const unsubscribedCourse = await getPrismaClient().course.create({
    data: { title: 'Other Course', isPublished: true, sortOrder: 2 },
  });
  unsubscribedCourseId = unsubscribedCourse.id;

  await getPrismaClient().courseVideo.createMany({
    data: [
      { courseId, videoId: 'v1', position: 1 },
      { courseId, videoId: 'v2', position: 2 },
      { courseId, videoId: 'v3', position: 3 },
    ],
  });

  const plan = await getPrismaClient().plan.create({
    data: { name: 'Test Plan' },
  });
  await getPrismaClient().planCourse.create({
    data: { planId: plan.id, courseId },
  });
  await getPrismaClient().subscription.create({
    data: { userId: user.id, planId: plan.id, status: 'active' },
  });

  // v1: watched, v2: in-progress, v3: no entry (defaults to unwatched/0)
  await getPrismaClient().userVideoProgress.createMany({
    data: [
      { userId: user.id, videoId: 'v1', watched: true,  progressSecs: 0   },
      { userId: user.id, videoId: 'v2', watched: false, progressSecs: 120 },
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

describe('GET /me/courses', () => {
  it('returns 200 with only courses the user has an active subscription to and pagination metadata', async () => {
    const res = await request(app).get('/me/courses');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toMatchObject([
      { id: courseId, title: 'My Course', description: 'Subscribed course', sortOrder: 1 },
    ]);
    // unsubscribedCourse must not appear
    expect(res.body.data.every((c: { id: string }) => c.id !== unsubscribedCourseId)).toBe(true);
    expect(res.body.pagination).toMatchObject({
      total: 1,
      limit: expect.any(Number),
      offset: 0,
      hasMore: false,
    });
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get('/me/courses?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /me/courses/:id/videos', () => {
  it('returns 200 with videos in position order and per-user progress', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject([
      { id: 'v1', title: 'Video One',   watched: true,  progressSecs: 0   },
      { id: 'v2', title: 'Video Two',   watched: false, progressSecs: 120 },
      { id: 'v3', title: 'Video Three', watched: false, progressSecs: 0   },
    ]);
    expect(res.body.pagination).toMatchObject({
      total: 3,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos?limit=1&offset=1`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject([{ id: 'v2', watched: false, progressSecs: 120 }]);
    expect(res.body.pagination).toMatchObject({ total: 3, limit: 1, offset: 1, hasMore: true });
  });

  it('returns 403 if user has no active subscription to a plan including this course', async () => {
    const res = await request(app).get(`/me/courses/${unsubscribedCourseId}/videos`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 400 for an invalid course UUID', async () => {
    const res = await request(app).get('/me/courses/not-a-uuid/videos');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid course ID format');
  });
});
