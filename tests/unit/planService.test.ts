import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import { createPlan, getAllPlans, getPlanById } from '../../src/services/planService.js'
import { BillingInterval } from '../../prisma/generated/enums.js'

const mockCreate = vi.fn()
const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockFindUnique = vi.fn()

function applyMock() {
    vi.mocked(getPrismaClient).mockReturnValue({
        plan: { create: mockCreate, findMany: mockFindMany, count: mockCount, findUnique: mockFindUnique },
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
}

const storedPlan = { id: 'plan-uuid', ...planData }

describe('createPlan', () => {
    it('creates and returns the plan', async () => {
        mockCreate.mockResolvedValue(storedPlan)

        const result = await createPlan(planData)

        expect(mockCreate).toHaveBeenCalledWith({ data: planData })
        expect(result).toEqual(storedPlan)
    })
})

describe('getAllPlans', () => {
    it('returns plans and total count', async () => {
        const plans = [storedPlan]
        mockFindMany.mockResolvedValue(plans)
        mockCount.mockResolvedValue(1)

        const result = await getAllPlans(10, 0)

        expect(mockFindMany).toHaveBeenCalledWith({ take: 10, skip: 0 })
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
