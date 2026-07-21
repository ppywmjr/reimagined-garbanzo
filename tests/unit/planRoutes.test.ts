import { vi, describe, it, expect } from 'vitest'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as planService from '../../src/services/planService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/planService.js', () => ({
    createPlan: vi.fn(),
    getAllPlans: vi.fn(),
    getPlanById: vi.fn(),
    patchPlan: vi.fn(),
    addCourseToPlan: vi.fn(),
    removeCourseFromPlan: vi.fn(),
    replacePlanCourses: vi.fn(),
}))

const planData = {
    name: 'Pro',
    stripeProductId: 'prod_123',
    stripePriceId: 'price_123',
    billingInterval: 'month' as const,
    pricePence: 999,
    isActive: true,
    thumbnail: 'https://example.com/thumb.jpg',
}

const storedPlan = { id: 'plan-uuid', ...planData }

const PLAN_ID = '123e4567-e89b-12d3-a456-426614174000'
const COURSE_ID = '123e4567-e89b-12d3-a456-426614174001'

describe('POST /plans', () => {
    it('creates a plan and returns 201 on success', async () => {
        vi.mocked(planService.createPlan).mockResolvedValue(storedPlan as any)

        const res = await request(app).post('/plans').send(planData)

        expect(res.status).toBe(201)
        expect(res.body).toEqual({ success: true, data: storedPlan })
        expect(planService.createPlan).toHaveBeenCalledWith(planData)
    })

    it('returns 400 when body validation fails - missing name', async () => {
        const res = await request(app).post('/plans').send({})

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - empty name', async () => {
        const res = await request(app).post('/plans').send({ name: '' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - name too long', async () => {
        const res = await request(app).post('/plans').send({ name: 'a'.repeat(201) })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - negative pricePence', async () => {
        const res = await request(app).post('/plans').send({ name: 'Plan', pricePence: -100 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - non-integer pricePence', async () => {
        const res = await request(app).post('/plans').send({ name: 'Plan', pricePence: 99.9 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - invalid billingInterval', async () => {
        const res = await request(app).post('/plans').send({ name: 'Plan', billingInterval: 'week' as any })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('accepts billingInterval month', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Monthly Plan', billingInterval: 'month' }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Monthly Plan',
            billingInterval: 'month',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('accepts billingInterval year', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Yearly Plan', billingInterval: 'year' }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Yearly Plan',
            billingInterval: 'year',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('accepts isActive false', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Inactive Plan', isActive: false }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Inactive Plan',
            isActive: false,
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('accepts courseIds array', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Course Plan' }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Course Plan',
            courseIds: ['123e4567-e89b-12d3-a456-426614174000'],
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('uses default isActive true when not provided', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Default Plan', isActive: true }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({ name: 'Default Plan' })

        expect(res.status).toBe(201)
        expect(res.body.data.isActive).toBe(true)
    })

    it('accepts empty courseIds array', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Empty Courses Plan', courseIds: [] }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Empty Courses Plan',
            courseIds: [],
        })

        expect(res.status).toBe(201)
    })

    it('accepts zero pricePence', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Free Plan', pricePence: 0 }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Free Plan',
            pricePence: 0,
        })

        expect(res.status).toBe(201)
    })

    it('accepts thumbnail in request body', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'Thumbnail Plan', thumbnail: 'https://example.com/thumb.jpg' }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'Thumbnail Plan',
            thumbnail: 'https://example.com/thumb.jpg',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.thumbnail).toBe('https://example.com/thumb.jpg')
    })

    it('accepts plan without thumbnail', async () => {
        const createdPlan = { id: 'plan-uuid', name: 'No Thumbnail Plan' }
        vi.mocked(planService.createPlan).mockResolvedValue(createdPlan as any)

        const res = await request(app).post('/plans').send({
            name: 'No Thumbnail Plan',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })
})

describe('GET /plans', () => {
    it('returns plans with pagination', async () => {
        const plans = [storedPlan] as any
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
        const plans = [storedPlan, storedPlan] as any
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans, total: 10 })

        const res = await request(app).get('/plans')

        expect(res.body.pagination.hasMore).toBe(true)
    })

    it('returns empty array when no plans exist', async () => {
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans: [], total: 0 })

        const res = await request(app).get('/plans')

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual([])
        expect(res.body.pagination.total).toBe(0)
        expect(res.body.pagination.hasMore).toBe(false)
    })

    it('supports custom pagination query params', async () => {
        const plans: any = [{ id: 'plan-2', name: 'Second Plan' }]
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans, total: 100 })

        const res = await request(app).get('/plans?limit=5&offset=10')

        expect(res.status).toBe(200)
        expect(planService.getAllPlans).toHaveBeenCalledWith(5, 10)
    })

    it('returns hasMore false when all results are returned', async () => {
        const plans: any = [{ id: 'plan-1', name: 'Plan 1' }]
        vi.mocked(planService.getAllPlans).mockResolvedValue({ plans, total: 1 })

        const res = await request(app).get('/plans?limit=5&offset=0')

        expect(res.body.pagination.hasMore).toBe(false)
    })
})

describe('GET /plans/:id', () => {
    it('returns the plan when found', async () => {
        vi.mocked(planService.getPlanById).mockResolvedValue(storedPlan as any)

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

    it('handles trailing slash plan route', async () => {
        const res = await request(app).get('/plans/')

        expect(res.status).toBe(200)
    })

    it('returns 400 for UUID with extra characters', async () => {
        const res = await request(app).get('/plans/123e4567-e89b-12d3-a456-426614174000-extra')

        expect(res.status).toBe(400)
    })

    it('returns 400 for UUID with special characters', async () => {
        const res = await request(app).get('/plans/%40%23%24%25')

        expect(res.status).toBe(400)
    })
})

describe('PATCH /plans/:id', () => {
    it('patches a plan and returns the updated plan', async () => {
        const updatedPlan = { id: PLAN_ID, name: 'Updated Plan', description: 'New desc' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            name: 'Updated Plan',
            description: 'New desc',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(updatedPlan)
    })

    it('returns 400 for invalid UUID format', async () => {
        const res = await request(app).patch('/plans/not-a-uuid').send({ name: 'Updated' })

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })

    it('returns 400 when body validation fails - empty name', async () => {
        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({ name: '' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - name too long', async () => {
        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({ name: 'a'.repeat(201) })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - negative pricePence', async () => {
        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({ pricePence: -100 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - non-integer pricePence', async () => {
        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({ pricePence: 99.9 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('accepts partial updates - name only', async () => {
        const updatedPlan = { id: PLAN_ID, name: 'New Name' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            name: 'New Name',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts partial updates - isActive only', async () => {
        const updatedPlan = { id: PLAN_ID, isActive: false }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            isActive: false,
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts partial updates - pricePence only', async () => {
        const updatedPlan = { id: PLAN_ID, pricePence: 1999 }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            pricePence: 1999,
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts partial updates - stripeProductId only', async () => {
        const updatedPlan = { id: PLAN_ID, stripeProductId: 'prod_new' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            stripeProductId: 'prod_new',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts partial updates - stripePriceId only', async () => {
        const updatedPlan = { id: PLAN_ID, stripePriceId: 'price_new' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            stripePriceId: 'price_new',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts zero pricePence', async () => {
        const updatedPlan = { id: PLAN_ID, pricePence: 0 }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            pricePence: 0,
        })

        expect(res.status).toBe(200)
    })

    it('accepts empty body', async () => {
        const updatedPlan = { id: PLAN_ID, name: 'Original' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({})

        expect(res.status).toBe(200)
    })

    it('accepts description update', async () => {
        const updatedPlan = { id: PLAN_ID, description: 'Updated description' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            description: 'Updated description',
        })

        expect(res.status).toBe(200)
    })

    it('handles invalid plan ID with special characters', async () => {
        const res = await request(app).patch('/plans/%40%23%24').send({ name: 'Test' })

        expect(res.status).toBe(400)
    })

    it('accepts thumbnail update', async () => {
        const updatedPlan = { id: PLAN_ID, thumbnail: 'https://example.com/new-thumb.jpg' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            thumbnail: 'https://example.com/new-thumb.jpg',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.thumbnail).toBe('https://example.com/new-thumb.jpg')
    })

    it('accepts thumbnail with other fields', async () => {
        const updatedPlan = { id: PLAN_ID, name: 'Updated Plan', thumbnail: 'https://example.com/updated-thumb.jpg' }
        vi.mocked(planService.patchPlan).mockResolvedValue(updatedPlan as any)

        const res = await request(app).patch(`/plans/${PLAN_ID}`).send({
            name: 'Updated Plan',
            thumbnail: 'https://example.com/updated-thumb.jpg',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.thumbnail).toBe('https://example.com/updated-thumb.jpg')
    })
})

describe('POST /plans/:planId/courses/:courseId', () => {
    it('adds a course to a plan and returns 201 on success', async () => {
        const result = { planId: PLAN_ID, courseId: COURSE_ID }
        vi.mocked(planService.addCourseToPlan).mockResolvedValue(result as any)

        const res = await request(app).post(`/plans/${PLAN_ID}/courses/${COURSE_ID}`).send()

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(result)
    })

    it('returns 400 for invalid plan UUID format', async () => {
        const res = await request(app).post('/plans/not-a-uuid/courses/' + COURSE_ID).send()

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })

    it('returns 400 for invalid course UUID format', async () => {
        const res = await request(app).post(`/plans/${PLAN_ID}/courses/not-a-uuid`).send()

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 400 for invalid plan and course UUID formats', async () => {
        const res = await request(app).post('/plans/not-a-uuid/courses/not-a-uuid').send()

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })

    it('calls addCourseToPlan with correct IDs', async () => {
        const result = { planId: PLAN_ID, courseId: COURSE_ID }
        vi.mocked(planService.addCourseToPlan).mockResolvedValue(result as any)

        await request(app).post(`/plans/${PLAN_ID}/courses/${COURSE_ID}`).send()

        expect(planService.addCourseToPlan).toHaveBeenCalledWith(PLAN_ID, COURSE_ID)
    })

    it('returns 400 for plan ID with special characters', async () => {
        const res = await request(app).post('/plans/%40%23%24/courses/' + COURSE_ID).send()

        expect(res.status).toBe(400)
    })

    it('returns 400 for course ID with special characters', async () => {
        const res = await request(app).post(`/plans/${PLAN_ID}/courses/%40%23%24`).send()

        expect(res.status).toBe(400)
    })
})

describe('DELETE /plans/:planId/courses/:courseId', () => {
    it('removes a course from a plan and returns success', async () => {
        const result = { planId: PLAN_ID, courseId: COURSE_ID }
        vi.mocked(planService.removeCourseFromPlan).mockResolvedValue(result as any)

        const res = await request(app).delete(`/plans/${PLAN_ID}/courses/${COURSE_ID}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(result)
    })

    it('returns 400 for invalid plan UUID format', async () => {
        const res = await request(app).delete('/plans/not-a-uuid/courses/' + COURSE_ID)

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })

    it('returns 400 for invalid course UUID format', async () => {
        const res = await request(app).delete(`/plans/${PLAN_ID}/courses/not-a-uuid`)

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 400 for invalid plan and course UUID formats', async () => {
        const res = await request(app).delete('/plans/not-a-uuid/courses/not-a-uuid')

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid plan ID format' })
    })

    it('calls removeCourseFromPlan with correct IDs', async () => {
        const result = { planId: PLAN_ID, courseId: COURSE_ID }
        vi.mocked(planService.removeCourseFromPlan).mockResolvedValue(result as any)

        await request(app).delete(`/plans/${PLAN_ID}/courses/${COURSE_ID}`)

        expect(planService.removeCourseFromPlan).toHaveBeenCalledWith(PLAN_ID, COURSE_ID)
    })

    it('returns 400 for plan ID with special characters', async () => {
        const res = await request(app).delete('/plans/%40%23%24/courses/' + COURSE_ID)

        expect(res.status).toBe(400)
    })

    it('returns 400 for course ID with special characters', async () => {
        const res = await request(app).delete(`/plans/${PLAN_ID}/courses/%40%23%24`)

        expect(res.status).toBe(400)
    })
})