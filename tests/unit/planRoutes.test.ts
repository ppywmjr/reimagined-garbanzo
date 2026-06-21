import { vi, describe, it, expect, beforeEach } from 'vitest'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as planService from '../../src/services/planService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/planService.js', () => ({
    createPlan: vi.fn(),
    getAllPlans: vi.fn(),
    getPlanById: vi.fn(),
}))

const planData = {
    name: 'Pro',
    stripeProductId: 'prod_123',
    stripePriceId: 'price_123',
    billingInterval: 'month' as const,
    pricePence: 999,
    isActive: true,
}

const storedPlan = { id: 'plan-uuid', ...planData }

describe('POST /plans', () => {
    it('creates a plan and returns 201 on success', async () => {
        vi.mocked(planService.createPlan).mockResolvedValue(storedPlan)

        const res = await request(app).post('/plans').send(planData)

        expect(res.status).toBe(201)
        expect(res.body).toEqual({ success: true, data: storedPlan })
        expect(planService.createPlan).toHaveBeenCalledWith(planData)
    })

    it('returns 400 when body validation fails', async () => {
        const res = await request(app).post('/plans').send({ name: '' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })
})

describe('GET /plans', () => {
    it('returns plans with pagination', async () => {
        const plans = [storedPlan]
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans, total: 1 })

        const res = await request(app).get('/plans')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(plans)
        expect(res.body.pagination).toEqual({
            total: 1,
            limit: expect.any(Number),
            offset: expect.any(Number),
            hasMore: false,
        })
    })

    it('mutates hasMore to true when there are more results', async () => {
        const plans = [storedPlan, storedPlan]
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans, total: 10 })

        const res = await request(app).get('/plans')

        expect(res.body.pagination.hasMore).toBe(true)
    })
})

describe('GET /plans/:id', () => {
    it('returns the plan when found', async () => {
        vi.mocked(planService.getPlanById).mockResolvedValue(storedPlan)

        const res = await request(app).get('/plans/123e4567-e89b-12d3-a456-426614174000')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(storedPlan)
    })

    it('returns 404 when plan is not found', async () => {
        vi.mocked(planService.getPlanById).mockResolvedValue(null)

        const res = await request(app).get('/plans/00000000-0000-0000-0000-000000000000')

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ success: false, error: 'Plan not found' })
    })

    it('returns 400 for invalid UUID format', async () => {
        const res = await request(app).get('/plans/not-a-uuid')

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })
})
