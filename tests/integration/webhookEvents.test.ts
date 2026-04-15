import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { request } from '../helpers/api';
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
  await getPrismaClient().webhookEvent.deleteMany();
  await disconnectPrisma();
  await container.stop();
});

function validEvent(suffix = '001') {
  return {
    stripeEventId: `evt_test_${suffix}`,
    eventType: 'checkout.session.completed',
    payload: { id: `evt_test_${suffix}`, type: 'checkout.session.completed' },
    status: 'pending',
  };
}

describe('POST /webhook-events', () => {
  it('returns 201 and creates a webhook event', async () => {
    const res = await request(app).post('/webhook-events').send(validEvent());

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toMatchObject({
      id: expect.any(String),
      stripeEventId: 'evt_test_001',
      eventType: 'checkout.session.completed',
      status: 'pending',
    });
  });

  it('returns 400 for an invalid status', async () => {
    const res = await request(app)
      .post('/webhook-events')
      .send({ ...validEvent('bad'), status: 'done' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe('GET /webhook-events', () => {
  it('returns 200 with a list of webhook events and pagination metadata', async () => {
    const res = await request(app).get('/webhook-events');

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
    const res = await request(app).get('/webhook-events?limit=1&offset=0');

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

describe('GET /webhook-events/:id', () => {
  let existingEventId: string;

  beforeAll(async () => {
    const event = await getPrismaClient().webhookEvent.findFirst();
    if (!event) throw new Error('No webhook event seed data found');
    existingEventId = event.id;
  });

  it('returns 200 with the correct event for a valid existing ID', async () => {
    const res = await request(app).get(`/webhook-events/${existingEventId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(existingEventId);
  });

  it('returns 404 for a valid UUID that does not exist', async () => {
    const res = await request(app).get('/webhook-events/00000000-0000-0000-0000-000000000000');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Webhook event not found');
  });

  it('returns 400 for an invalid UUID format', async () => {
    const res = await request(app).get('/webhook-events/not-a-valid-uuid');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('Invalid webhook event ID format');
  });
});
