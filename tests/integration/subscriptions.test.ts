import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;
let userId: string;
let planId: string;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });

  const user = await getPrismaClient().user.create({
    data: { clerkUserId: 'clerk_sub_test', email: 'sub@test.com' },
  });
  userId = user.id;

  const plan = await getPrismaClient().plan.create({
    data: {
      name: 'Monthly',
      stripeProductId: 'prod_sub_test',
      stripePriceId: 'price_sub_test',
      billingInterval: 'month',
      pricePence: 999,
      isActive: true,
      features: {},
    },
  });
  planId = plan.id;
}, 60_000);

afterAll(async () => {
  await getPrismaClient().subscription.deleteMany();
  await getPrismaClient().plan.deleteMany();
  await getPrismaClient().user.deleteMany();
  await disconnectPrisma();
  await container.stop();
});

const periodStart = '2026-04-01T00:00:00.000Z';
const periodEnd = '2026-05-01T00:00:00.000Z';

function validSub() {
  return {
    userId,
    planId,
    stripeCustomerId: 'cus_test_001',
    stripeSubscriptionId: `sub_test_${Date.now()}`,
    status: 'active',
    currentPeriodStart: periodStart,
    currentPeriodEnd: periodEnd,
  };
}

describe('POST /subscriptions', () => {
  it('returns 201 and creates a subscription', async () => {
    const res = await request(app).post('/subscriptions').send(validSub());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      userId,
      status: 'active',
    });
  });

  it('returns 400 for an invalid status', async () => {
    const res = await request(app)
      .post('/subscriptions')
      .send({ ...validSub(), status: 'bogus' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /subscriptions', () => {
  it('returns 200 with a list of subscriptions and pagination metadata', async () => {
    const res = await request(app).get('/subscriptions');

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
    const res = await request(app).get('/subscriptions?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /subscriptions/flutters/videos', () => {
  it('returns 200 with stubbed video data and pagination metadata', async () => {
    const res = await request(app).get('/subscriptions/flutters/videos');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([
      {
        id: 'bjgqwBQ8-7g',
        title: 'Propulsion 2025 2-8 — Catherine Taylor',
        url: 'https://www.youtube.com/watch?v=bjgqwBQ8-7g',
        thumbnail: 'https://i.ytimg.com/vi/bjgqwBQ8-7g/hqdefault.jpg',
        channelName: 'Propulsion UK',
        watched: false,
        progress: 312,
      },
      {
        id: 'DN22xptfnes',
        title: 'Propulsion 2025 1-1 — A Singular Magic (Catherine Taylor)',
        url: 'https://www.youtube.com/watch?v=DN22xptfnes&list=RDDN22xptfnes&start_radio=1',
        thumbnail: 'https://i.ytimg.com/vi/DN22xptfnes/hqdefault.jpg',
        channelName: 'Propulsion UK',
        watched: true,
        progress: 0,
      },
      {
        id: 'BMkwmQmUa_g',
        title: 'Amy Sigil as The Gwragged Annwn',
        url: 'https://www.youtube.com/watch?v=BMkwmQmUa_g&list=RDBMkwmQmUa_g&start_radio=1',
        thumbnail: 'https://i.ytimg.com/vi/BMkwmQmUa_g/hqdefault.jpg',
        channelName: 'Amy Sigil',
        watched: false,
        progress: 0,
      },
    ]);
    expect(res.body.pagination).toMatchObject({
      total: 3,
      limit: 20,
      offset: 0,
      hasMore: false,
    });
  });

  it('respects limit and offset query parameters', async () => {
    const res = await request(app).get('/subscriptions/flutters/videos?limit=1&offset=1');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([
      {
        id: 'DN22xptfnes',
        title: 'Propulsion 2025 1-1 — A Singular Magic (Catherine Taylor)',
        url: 'https://www.youtube.com/watch?v=DN22xptfnes&list=RDDN22xptfnes&start_radio=1',
        thumbnail: 'https://i.ytimg.com/vi/DN22xptfnes/hqdefault.jpg',
        channelName: 'Propulsion UK',
        watched: true,
        progress: 0,
      },
    ]);
    expect(res.body.pagination).toMatchObject({
      total: 3,
      limit: 1,
      offset: 1,
      hasMore: true,
    });
  });
});

describe('GET /subscriptions/:id', () => {
  let existingSubId: string;

  beforeAll(async () => {
    const sub = await getPrismaClient().subscription.findFirst();
    if (!sub) throw new Error('No subscription seed data found');
    existingSubId = sub.id;
  });

  it('returns 200 with the correct subscription for a valid existing ID', async () => {
    const res = await request(app).get(`/subscriptions/${existingSubId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(existingSubId);
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const res = await request(app).get('/subscriptions/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Subscription not found');
  });

  it('returns 400 for an invalid UUID format', async () => {
    const res = await request(app).get('/subscriptions/not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid subscription ID format');
  });
});
