import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import request from 'supertest';
import { execSync } from 'child_process';
import app from '../../src/app';
import { getPrismaClient, disconnectPrisma } from '../../src/lib/prisma';

let container: StartedPostgreSqlContainer;

beforeAll(async () => {
  container = await new PostgreSqlContainer('postgres:16').start();
  process.env.DATABASE_URL = container.getConnectionUri();
  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: container.getConnectionUri() },
  });
}, 60_000);

afterAll(async () => {
  await getPrismaClient().plan.deleteMany();
  await disconnectPrisma();
  await container.stop();
});

const validPlan = {
  name: 'Monthly',
  stripeProductId: 'prod_test_001',
  stripePriceId: 'price_test_001',
  billingInterval: 'month',
  pricePence: 999,
  isActive: true,
};

describe('POST /plans', () => {
  it('returns 201 and creates a plan', async () => {
    const res = await request(app).post('/plans').send(validPlan);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      name: 'Monthly',
      billingInterval: 'month',
      pricePence: 999,
      isActive: true,
    });
  });

  it('returns 400 for an invalid billingInterval', async () => {
    const res = await request(app).post('/plans').send({ ...validPlan, billingInterval: 'week' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /plans', () => {
  it('returns 200 with a list of plans and pagination metadata', async () => {
    const res = await request(app).get('/plans');

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
    const res = await request(app).get('/plans?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /plans/:id', () => {
  let existingPlanId: string;

  beforeAll(async () => {
    const plan = await getPrismaClient().plan.findFirst();
    if (!plan) throw new Error('No plan seed data found');
    existingPlanId = plan.id;
  });

  it('returns 200 with the correct plan for a valid existing ID', async () => {
    const res = await request(app).get(`/plans/${existingPlanId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(existingPlanId);
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const res = await request(app).get('/plans/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Plan not found');
  });

  it('returns 400 for an invalid UUID format', async () => {
    const res = await request(app).get('/plans/not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid plan ID format');
  });
});
