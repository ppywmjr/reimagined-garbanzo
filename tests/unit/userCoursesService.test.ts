import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import {
    userHasAccessToCourse,
    getUserCourses,
    buildCourseAccessWhere,
    buildUserCoursesWhere,
} from '../../src/services/userCoursesService.js'

const mockSubscriptionFindFirst = vi.fn()
const mockCourseFindMany = vi.fn()
const mockCourseCount = vi.fn()

function applyMock() {
    vi.mocked(getPrismaClient).mockReturnValue({
        subscription: { findFirst: mockSubscriptionFindFirst },
        course: { findMany: mockCourseFindMany, count: mockCourseCount },
    } as any)
}

beforeEach(() => {
    vi.clearAllMocks()
    applyMock()
})

describe('userHasAccessToCourse', () => {
    it('returns true when an active subscription granting access exists', async () => {
        mockSubscriptionFindFirst.mockResolvedValue({ id: 'sub_1' })

        const result = await userHasAccessToCourse('clerk_123', 'course_1')

        expect(result).toBe(true)
        expect(mockSubscriptionFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.any(Object) }),
        )
    })

    it('returns false when no matching subscription is found', async () => {
        mockSubscriptionFindFirst.mockResolvedValue(null)

        const result = await userHasAccessToCourse('clerk_123', 'course_1')

        expect(result).toBe(false)
    })
})

describe('getUserCourses', () => {
    const courses = [
        { id: 'c1', title: 'Course One', description: null, thumbnail: null, sortOrder: 1 },
    ]

    it('returns courses and total count for the user', async () => {
        mockCourseFindMany.mockResolvedValue(courses)
        mockCourseCount.mockResolvedValue(1)

        const result = await getUserCourses('clerk_123', 10, 0)

        expect(mockCourseFindMany).toHaveBeenCalledWith({
            where: expect.objectContaining({ isPublished: true }),
            select: expect.any(Object),
            take: 10,
            skip: 0,
            orderBy: { sortOrder: 'asc' },
        })
        expect(mockCourseCount).toHaveBeenCalledWith({
            where: expect.objectContaining({ isPublished: true }),
        })
        expect(result).toEqual({ courses, total: 1 })
    })

    it('returns an empty list when the user has no courses', async () => {
        mockCourseFindMany.mockResolvedValue([])
        mockCourseCount.mockResolvedValue(0)

        const result = await getUserCourses('clerk_123', 10, 0)

        expect(result).toEqual({ courses: [], total: 0 })
    })
})

describe('buildCourseAccessWhere', () => {
    it('spreads the subscription filter at the top level', () => {
        const where = buildCourseAccessWhere('clerk_123', 'course_1')
        expect(where.user).toEqual({ clerkUserId: 'clerk_123' })
        expect(where.status.in).toHaveLength(2)
        expect(where.AND).toHaveLength(2)
    })

    it('includes the courseId in the planCourses filter', () => {
        const where = buildCourseAccessWhere('clerk_123', 'course_1')
        expect(where.plan.planCourses.some).toEqual({ courseId: 'course_1' })
    })
})

describe('buildUserCoursesWhere', () => {
    it('filters for published courses only', () => {
        const where = buildUserCoursesWhere('clerk_123')
        expect(where.isPublished).toBe(true)
    })

    it('nests the subscription filter inside planCourses.some.plan.subscriptions.some', () => {
        const where = buildUserCoursesWhere('clerk_123')
        const subscriptionFilter = where.planCourses.some.plan.subscriptions.some
        expect(subscriptionFilter.user).toEqual({ clerkUserId: 'clerk_123' })
        expect(subscriptionFilter.status.in).toHaveLength(2)
        expect(subscriptionFilter.AND).toHaveLength(2)
    })
})
