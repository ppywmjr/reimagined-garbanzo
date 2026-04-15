import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { request } from '../helpers/api';
import { execSync } from 'child_process';
import { randomUUID } from 'crypto';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;
let courseId: string;
let unsubscribedCourseId: string;
let videoId1: string;
let videoId2: string;
let videoId3: string;

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

  videoId1 = randomUUID();
  videoId2 = randomUUID();
  videoId3 = randomUUID();

  await getPrismaClient().video.createMany({
    data: [
      { id: videoId1, title: 'Video One',   url: 'https://example.com/v1', thumbnail: 'https://example.com/v1.jpg' },
      { id: videoId2, title: 'Video Two',   url: 'https://example.com/v2', thumbnail: 'https://example.com/v2.jpg' },
      { id: videoId3, title: 'Video Three', url: 'https://example.com/v3', thumbnail: 'https://example.com/v3.jpg' },
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
      { courseId, videoId: videoId1, position: 1 },
      { courseId, videoId: videoId2, position: 2 },
      { courseId, videoId: videoId3, position: 3 },
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

  // videoId1: watched, videoId2: in-progress, videoId3: no entry (defaults to unwatched/0)
  await getPrismaClient().userVideoProgress.createMany({
    data: [
      { userId: user.id, videoId: videoId1, watched: true,  progressSecs: 0   },
      { userId: user.id, videoId: videoId2, watched: false, progressSecs: 120 },
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
      { id: videoId1, title: 'Video One',   watched: true,  progressSecs: 0   },
      { id: videoId2, title: 'Video Two',   watched: false, progressSecs: 120 },
      { id: videoId3, title: 'Video Three', watched: false, progressSecs: 0   },
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
    expect(res.body.data).toMatchObject([{ id: videoId2, watched: false, progressSecs: 120 }]);
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

describe('GET /me/courses/:id/videos/:videoId', () => {
  it('returns 200 with the video and user progress', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos/${videoId1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: videoId1,
      title: 'Video One',
      watched: true,
      progressSecs: 0,
    });
  });

  it('returns progress for a video with partial progress', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos/${videoId2}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: videoId2, watched: false, progressSecs: 120 });
  });

  it('returns defaults for a video with no progress entry', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos/${videoId3}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ id: videoId3, watched: false, progressSecs: 0 });
  });

  it('returns 403 if user has no active subscription to a plan including this course', async () => {
    const res = await request(app).get(`/me/courses/${unsubscribedCourseId}/videos/${videoId1}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 404 if the video does not exist in the course', async () => {
    const nonExistentVideoId = randomUUID();
    const res = await request(app).get(`/me/courses/${courseId}/videos/${nonExistentVideoId}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Video not found');
  });

  it('returns 400 for an invalid video UUID', async () => {
    const res = await request(app).get(`/me/courses/${courseId}/videos/not-a-uuid`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid video ID format');
  });

  it('returns 400 for an invalid course UUID', async () => {
    const res = await request(app).get(`/me/courses/not-a-uuid/videos/${randomUUID()}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid course ID format');
  });
});

describe('POST /me/courses/:id/videos/:videoId/progress', () => {
  it('creates a new progress entry and returns it', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId3}/progress`)
      .send({ watched: true, progressSecs: 42 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({ videoId: videoId3, watched: true, progressSecs: 42 });
    expect(res.body.data.updatedAt).toBeDefined();
  });

  it('updates an existing progress entry', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId3}/progress`)
      .send({ watched: false, progressSecs: 99 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ videoId: videoId3, watched: false, progressSecs: 99 });
  });

  it('accepts a partial update with only watched', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId1}/progress`)
      .send({ watched: false });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ videoId: videoId1, watched: false });
  });

  it('accepts a partial update with only progressSecs', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId2}/progress`)
      .send({ progressSecs: 200 });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ videoId: videoId2, progressSecs: 200 });
  });

  it('returns 400 when body has no valid fields', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId1}/progress`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for wrong field types', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${videoId1}/progress`)
      .send({ watched: 'yes', progressSecs: -5 });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 403 if user has no active subscription to the course', async () => {
    const res = await request(app)
      .post(`/me/courses/${unsubscribedCourseId}/videos/${videoId1}/progress`)
      .send({ watched: true });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Forbidden');
  });

  it('returns 404 if the video does not exist in the course', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/${randomUUID()}/progress`)
      .send({ watched: true });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Video not found');
  });

  it('returns 400 for an invalid video UUID', async () => {
    const res = await request(app)
      .post(`/me/courses/${courseId}/videos/not-a-uuid/progress`)
      .send({ watched: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid video ID format');
  });

  it('returns 400 for an invalid course UUID', async () => {
    const res = await request(app)
      .post(`/me/courses/not-a-uuid/videos/${randomUUID()}/progress`)
      .send({ watched: true });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid course ID format');
  });
});
