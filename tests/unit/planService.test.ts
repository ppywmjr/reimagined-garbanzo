import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import {
    createPlan,
    getAllPlans,
    getPlanById,
    patchPlan,
    addCourseToPlan,
    removeCourseFromPlan,
    replacePlanCourses,
} from '../../src/services/planService.js'
import { BillingInterval } from '../../prisma/generated/enums.js'

const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockFindUnique = vi.fn()
const mockUpdate = vi.fn()
const mockUpsert = vi.fn()
const mockDeleteMany = vi.fn()
const mockPlanCourseUpsert = vi.fn()
const mockPlanCourseDelete = vi.fn()
const mockPlanCourseDeleteMany = vi.fn()
const mockPlanCourseCreateMany = vi.fn()

function applyMock() {
    vi.mocked(getPrismaClient).mockReturnValue({
        plan: {
            create: mockCreate,
            findMany: mockFindMany,
            count: mockCount,
            findUnique: mockFindUnique,
            update: mockUpdate,
        },
        planCourse: {
            upsert: mockPlanCourseUpsert,
            delete: mockPlanCourseDelete,
            deleteMany: mockPlanCourseDeleteMany,
            createMany: mockPlanCourseCreateMany,
        },
    } as any)
}

beforeEach(() => {
    vi.clearAllMocks()
    applyMock()
})

const planData = {
    name: 'Pro',
    stripeProductId: 'prod_123',
    stripePriceId: 'price_123',
    billingInterval: BillingInterval.month,
    pricePence: 999,
    isActive: true,
    courseIds: [],
    thumbnail: 'https://example.com/thumb.jpg',
}

const storedPlan = { id: 'plan-uuid', ...planData }

const patchPlanData = {
    name: 'Pro Updated',
    description: 'Updated description',
    isActive: false,
    pricePence: 1999,
    stripeProductId: 'prod_updated',
    stripePriceId: 'price_updated',
    thumbnail: 'https://example.com/thumb-updated.jpg',
}

const updatedPlan = { id: 'plan-uuid', name: 'Pro Updated', description: 'Updated description', isActive: false, pricePence: 1999, stripeProductId: 'prod_updated', stripePriceId: 'price_updated', thumbnail: 'https://example.com/thumb-updated.jpg' }

describe('createPlan', () => {
    it('creates and returns the plan', async () => {
        mockCreate.mockResolvedValue(storedPlan)

        const result = await createPlan(planData)

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                name: planData.name,
                stripeProductId: planData.stripeProductId ?? null,
                stripePriceId: planData.stripePriceId ?? null,
                billingInterval: planData.billingInterval ?? null,
                pricePence: planData.pricePence ?? null,
                isActive: planData.isActive,
                thumbnail: planData.thumbnail ?? null,
                planCourses: {
                    createMany: {
                        data: [],
                    },
                },
            },
        })
        expect(result).toEqual(storedPlan)
    })

    it('uses empty array for courseIds when undefined', async () => {
        const minimalData = {
            name: 'Starter',
            isActive: true,
        }
        const createdPlan = { id: 'plan-2', ...minimalData }
        mockCreate.mockResolvedValue(createdPlan)

        const result = await createPlan(minimalData as any)

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                name: 'Starter',
                stripeProductId: null,
                stripePriceId: null,
                billingInterval: null,
                pricePence: null,
                isActive: true,
                thumbnail: null,
                planCourses: {
                    createMany: {
                        data: [],
                    },
                },
            },
        })
        expect(result).toEqual(createdPlan)
    })

    it('creates plan with courses when courseIds provided', async () => {
        const dataWithCourses = {
            name: 'Pro',
            isActive: true,
            courseIds: ['course-1', 'course-2'],
            thumbnail: 'https://example.com/pro-thumb.jpg',
        }
        const createdPlan = { id: 'plan-3', ...dataWithCourses }
        mockCreate.mockResolvedValue(createdPlan)

        const result = await createPlan(dataWithCourses as any)

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                name: 'Pro',
                stripeProductId: null,
                stripePriceId: null,
                billingInterval: null,
                pricePence: null,
                isActive: true,
                thumbnail: dataWithCourses.thumbnail ?? null,
                planCourses: {
                    createMany: {
                        data: [
                            { courseId: 'course-1' },
                            { courseId: 'course-2' },
                        ],
                    },
                },
            },
        })
        expect(result).toEqual(createdPlan)
    })

    it('nullifies optional string fields when explicitly undefined', async () => {
        const dataWithUndefined = {
            name: 'Basic',
            isActive: true,
            stripeProductId: undefined as any,
            stripePriceId: undefined as any,
            billingInterval: undefined as any,
            pricePence: undefined as any,
            thumbnail: undefined as any,
        }
        const createdPlan = { id: 'plan-4', name: 'Basic', isActive: true }
        mockCreate.mockResolvedValue(createdPlan)

        await createPlan(dataWithUndefined as any)

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                name: 'Basic',
                stripeProductId: null,
                stripePriceId: null,
                billingInterval: null,
                pricePence: null,
                isActive: true,
                thumbnail: null,
                planCourses: {
                    createMany: {
                        data: [],
                    },
                },
            },
        })
    })

    it('includes thumbnail when provided', async () => {
        const dataWithThumbnail = {
            name: 'Premium',
            isActive: true,
            thumbnail: 'https://example.com/premium-thumb.jpg',
        }
        const createdPlan = { id: 'plan-5', name: 'Premium', isActive: true, thumbnail: 'https://example.com/premium-thumb.jpg' }
        mockCreate.mockResolvedValue(createdPlan)

        const result = await createPlan(dataWithThumbnail as any)

        expect(mockCreate).toHaveBeenCalledWith({
            data: {
                name: 'Premium',
                stripeProductId: null,
                stripePriceId: null,
                billingInterval: null,
                pricePence: null,
                isActive: true,
                thumbnail: 'https://example.com/premium-thumb.jpg',
                planCourses: {
                    createMany: {
                        data: [],
                    },
                },
            },
        })
        expect(result).toEqual(createdPlan)
    })
})

describe('patchPlan', () => {
    it('updates the plan with provided data', async () => {
        mockUpdate.mockResolvedValue(updatedPlan)

        const result = await patchPlan('plan-uuid', patchPlanData)

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'plan-uuid' },
            data: patchPlanData,
        })
        expect(result).toEqual(updatedPlan)
    })

    it('updates only the thumbnail', async () => {
        mockUpdate.mockResolvedValue({ id: 'plan-uuid', thumbnail: 'https://example.com/new-thumb.jpg' })

        const result = await patchPlan('plan-uuid', { thumbnail: 'https://example.com/new-thumb.jpg' })

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'plan-uuid' },
            data: { thumbnail: 'https://example.com/new-thumb.jpg' },
        })
        expect(result).toEqual({ id: 'plan-uuid', thumbnail: 'https://example.com/new-thumb.jpg' })
    })

    it('updates only the provided fields', async () => {
        mockUpdate.mockResolvedValue({ id: 'plan-uuid', name: 'Pro New' })

        const result = await patchPlan('plan-uuid', { name: 'Pro New' })

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'plan-uuid' },
            data: { name: 'Pro New' },
        })
        expect(result).toEqual({ id: 'plan-uuid', name: 'Pro New' })
    })

    it('updates isActive to false', async () => {
        mockUpdate.mockResolvedValue({ id: 'plan-uuid', isActive: false })

        const result = await patchPlan('plan-uuid', { isActive: false })

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'plan-uuid' },
            data: { isActive: false },
        })
        expect(result).toEqual({ id: 'plan-uuid', isActive: false })
    })

    it('updates pricePence to zero', async () => {
        mockUpdate.mockResolvedValue({ id: 'plan-uuid', pricePence: 0 })

        const result = await patchPlan('plan-uuid', { pricePence: 0 })

        expect(mockUpdate).toHaveBeenCalledWith({
            where: { id: 'plan-uuid' },
            data: { pricePence: 0 },
        })
        expect(result).toEqual({ id: 'plan-uuid', pricePence: 0 })
    })

    it('returns the updated plan from Prisma', async () => {
        const prismaResult: any = { id: 'plan-uuid', name: 'Basic', isActive: true, pricePence: null }
        mockUpdate.mockResolvedValue(prismaResult)

        const result = await patchPlan('plan-uuid', { name: 'Basic', isActive: true } as any)

        expect(result).toEqual(prismaResult)
    })
})

describe('addCourseToPlan', () => {
    it('upserts a plan-course association', async () => {
        const upsertResult = { id: 'pc-uuid', planId: 'plan-uuid', courseId: 'course-uuid' }
        mockPlanCourseUpsert.mockResolvedValue(upsertResult)

        const result = await addCourseToPlan('plan-uuid', 'course-uuid')

        expect(mockPlanCourseUpsert).toHaveBeenCalledWith({
            where: { planId_courseId: { planId: 'plan-uuid', courseId: 'course-uuid' } },
            create: { planId: 'plan-uuid', courseId: 'course-uuid' },
            update: {},
        })
        expect(result).toEqual(upsertResult)
    })

    it('does not create duplicate if already exists', async () => {
        const existing = { id: 'pc-existing', planId: 'plan-uuid', courseId: 'course-uuid' }
        mockPlanCourseUpsert.mockResolvedValue(existing)

        const result = await addCourseToPlan('plan-uuid', 'course-uuid')

        expect(mockPlanCourseUpsert).toHaveBeenCalledWith({
            where: { planId_courseId: { planId: 'plan-uuid', courseId: 'course-uuid' } },
            create: { planId: 'plan-uuid', courseId: 'course-uuid' },
            update: {},
        })
        expect(result).toEqual(existing)
    })
})

describe('removeCourseFromPlan', () => {
    it('deletes the plan-course association', async () => {
        const deleteResult = { id: 'pc-uuid', planId: 'plan-uuid', courseId: 'course-uuid' }
        mockPlanCourseDelete.mockResolvedValue(deleteResult)

        const result = await removeCourseFromPlan('plan-uuid', 'course-uuid')

        expect(mockPlanCourseDelete).toHaveBeenCalledWith({
            where: { planId_courseId: { planId: 'plan-uuid', courseId: 'course-uuid' } },
        })
        expect(result).toEqual(deleteResult)
    })

    it('throws if the association does not exist', async () => {
        mockPlanCourseDelete.mockRejectedValue(new Error('RecordNotFound'))

        await expect(removeCourseFromPlan('plan-uuid', 'nonexistent-course')).rejects.toThrow('RecordNotFound')
    })
})

describe('replacePlanCourses', () => {
    it('deletes all existing courses and adds new ones', async () => {
        mockPlanCourseDeleteMany.mockResolvedValue({ count: 2 })
        mockPlanCourseCreateMany.mockResolvedValue({ count: 2 })

        const result = await replacePlanCourses('plan-uuid', ['course-1', 'course-2'])

        expect(mockPlanCourseDeleteMany).toHaveBeenCalledWith({
            where: { planId: 'plan-uuid' },
        })
        expect(mockPlanCourseCreateMany).toHaveBeenCalledWith({
            data: [
                { planId: 'plan-uuid', courseId: 'course-1' },
                { planId: 'plan-uuid', courseId: 'course-2' },
            ],
        })
        expect(result).toEqual({ count: 2 })
    })

    it('removes all courses when courseIds is empty', async () => {
        mockPlanCourseDeleteMany.mockResolvedValue({ count: 3 })

        const result = await replacePlanCourses('plan-uuid', [])

        expect(mockPlanCourseDeleteMany).toHaveBeenCalledWith({
            where: { planId: 'plan-uuid' },
        })
        expect(mockPlanCourseCreateMany).not.toHaveBeenCalled()
        // When courseIds is empty, the function returns undefined (no explicit return)
        expect(result).toBeUndefined()
    })

    it('handles single course replacement', async () => {
        mockPlanCourseDeleteMany.mockResolvedValue({ count: 1 })
        mockPlanCourseCreateMany.mockResolvedValue({ count: 1 })

        const result = await replacePlanCourses('plan-uuid', ['course-single'])

        expect(mockPlanCourseDeleteMany).toHaveBeenCalledWith({
            where: { planId: 'plan-uuid' },
        })
        expect(mockPlanCourseCreateMany).toHaveBeenCalledWith({
            data: [{ planId: 'plan-uuid', courseId: 'course-single' }],
        })
        expect(result).toEqual({ count: 1 })
    })

    it('deletes existing courses even when adding same courses', async () => {
        mockPlanCourseDeleteMany.mockResolvedValue({ count: 1 })
        mockPlanCourseCreateMany.mockResolvedValue({ count: 1 })

        await replacePlanCourses('plan-uuid', ['course-a'])

        // Verify delete happens first
        expect(mockPlanCourseDeleteMany).toHaveBeenCalledWith({
            where: { planId: 'plan-uuid' },
        })
    })
})

describe('getAllPlans', () => {
    it('returns plans and total count', async () => {
        const plans = [storedPlan]
        mockFindMany.mockResolvedValue(plans)
        mockCount.mockResolvedValue(1)

        const result = await getAllPlans(10, 0)

        expect(mockFindMany).toHaveBeenCalledWith({
            take: 10,
            skip: 0,
            include: {
                planCourses: {
                    include: {
                        course: true,
                    },
                },
            },
        })
        expect(mockCount).toHaveBeenCalled()
        expect(result).toEqual({ plans, total: 1 })
    })
})

describe('getPlanById', () => {
    it('returns the plan when found', async () => {
        mockFindUnique.mockResolvedValue(storedPlan)

        const result = await getPlanById('plan-uuid')

        expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'plan-uuid' } })
        expect(result).toEqual(storedPlan)
    })

    it('returns null when plan is not found', async () => {
        mockFindUnique.mockResolvedValue(null)

        const result = await getPlanById('missing')

        expect(result).toBeNull()
    })
})
