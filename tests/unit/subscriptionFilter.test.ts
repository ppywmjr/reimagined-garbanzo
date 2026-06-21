import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { SubscriptionStatus } from '../../prisma/generated/enums.js'
import { activeSubscriptionFilter } from '../../src/lib/subscriptionFilter.js'

describe('activeSubscriptionFilter', () => {
    const CLERK_ID = 'clerk_abc'
    const now = new Date('2026-06-21T10:00:00.000Z')

    beforeEach(() => {
        vi.useFakeTimers()
        vi.setSystemTime(now)
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('scopes the filter to the given clerkUserId', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        expect(filter.user).toEqual({ clerkUserId: CLERK_ID })
    })

    it('requires status to be active or trialing', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        expect(filter.status.in).toContain(SubscriptionStatus.active)
        expect(filter.status.in).toContain(SubscriptionStatus.trialing)
        expect(filter.status.in).toHaveLength(2)
    })

    it('includes exactly two AND conditions (period start and period end)', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        expect(filter.AND).toHaveLength(2)
    })

    it('currentPeriodStart condition allows null or a value lte now', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        const [startCondition] = filter.AND
        expect(startCondition.OR).toContainEqual({ currentPeriodStart: null })
        expect(startCondition.OR).toContainEqual({ currentPeriodStart: { lte: now } })
    })

    it('currentPeriodEnd condition allows null or a value gte now', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        const [, endCondition] = filter.AND
        expect(endCondition.OR).toContainEqual({ currentPeriodEnd: null })
        expect(endCondition.OR).toContainEqual({ currentPeriodEnd: { gte: now } })
    })

    it('uses the current time when building date bounds', () => {
        const filter = activeSubscriptionFilter(CLERK_ID)
        const [startCondition, endCondition] = filter.AND
        const startBound = startCondition.OR.find((o: any) => o.currentPeriodStart?.lte)
        const endBound = endCondition.OR.find((o: any) => o.currentPeriodEnd?.gte)
        expect(startBound.currentPeriodStart.lte).toEqual(now)
        expect(endBound.currentPeriodEnd.gte).toEqual(now)
    })
})
