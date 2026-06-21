import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import {
    getAllCourses,
    getCourseById,
    getCourseVideos,
    getCourseVideoById,
    buildUserProgressInclude,
    mapVideoResult,
} from '../../src/services/courseService.js'

const mockCourseFindMany = vi.fn()
const mockCourseCount = vi.fn()
const mockCourseFindFirst = vi.fn()
const mockCourseVideoFindMany = vi.fn()
const mockCourseVideoCount = vi.fn()
const mockCourseVideoFindFirst = vi.fn()

function applyMock() {
    vi.mocked(getPrismaClient).mockReturnValue({
        course: {
            findMany: mockCourseFindMany,
            count: mockCourseCount,
            findFirst: mockCourseFindFirst,
        },
        courseVideo: {
            findMany: mockCourseVideoFindMany,
            count: mockCourseVideoCount,
            findFirst: mockCourseVideoFindFirst,
        },
    } as any)
}

beforeEach(() => {
    vi.clearAllMocks()
    applyMock()
})

// ─── Pure helper functions ────────────────────────────────────────────────────

describe('buildUserProgressInclude', () => {
    it('returns { take: 0 } when clerkUserId is null', () => {
        expect(buildUserProgressInclude(null)).toEqual({ take: 0 })
    })

    it('returns a user-scoped where filter with take: 1 when clerkUserId is provided', () => {
        expect(buildUserProgressInclude('clerk_123')).toEqual({
            where: { user: { clerkUserId: 'clerk_123' } },
            take: 1,
        })
    })
})

const baseVideo = {
    id: 'v1',
    title: 'Video One',
    url: 'https://example.com/v1',
    thumbnail: 'https://example.com/v1.jpg',
}

describe('mapVideoResult', () => {
    it('maps watched and progressSecs from the first userProgress entry when present', () => {
        const result = mapVideoResult({
            ...baseVideo,
            userProgress: [{ watched: true, progressSecs: 120 }],
        })
        expect(result).toEqual({
            ...baseVideo,
            watched: true,
            progressSecs: 120,
        })
    })

    it('defaults watched to false and progressSecs to 0 when userProgress is empty', () => {
        const result = mapVideoResult({ ...baseVideo, userProgress: [] })
        expect(result.watched).toBe(false)
        expect(result.progressSecs).toBe(0)
    })
})

// ─── Service functions ────────────────────────────────────────────────────────

describe('getAllCourses', () => {
    it('returns published courses and total count', async () => {
        const courses = [{ id: 'c1', title: 'Course One', description: null, thumbnail: null, sortOrder: 1 }]
        mockCourseFindMany.mockResolvedValue(courses)
        mockCourseCount.mockResolvedValue(1)

        const result = await getAllCourses(10, 0)

        expect(mockCourseFindMany).toHaveBeenCalledWith({
            where: { isPublished: true },
            select: expect.any(Object),
            take: 10,
            skip: 0,
            orderBy: { sortOrder: 'asc' },
        })
        expect(mockCourseCount).toHaveBeenCalledWith({ where: { isPublished: true } })
        expect(result).toEqual({ courses, total: 1 })
    })
})

describe('getCourseById', () => {
    it('returns the course when found', async () => {
        const course = { id: 'c1', title: 'Course One', description: null, thumbnail: null, sortOrder: 1 }
        mockCourseFindFirst.mockResolvedValue(course)

        const result = await getCourseById('c1')

        expect(mockCourseFindFirst).toHaveBeenCalledWith({
            where: { id: 'c1', isPublished: true },
            select: expect.any(Object),
        })
        expect(result).toEqual(course)
    })

    it('returns null when the course is not found', async () => {
        mockCourseFindFirst.mockResolvedValue(null)
        expect(await getCourseById('missing')).toBeNull()
    })
})

const mockCourseVideo = (userProgress: Array<{ watched: boolean; progressSecs: number }>) => ({
    video: { ...baseVideo, userProgress },
})

describe('getCourseVideos', () => {
    it('passes null userId → { take: 0 } include to findMany', async () => {
        mockCourseVideoFindMany.mockResolvedValue([mockCourseVideo([])])
        mockCourseVideoCount.mockResolvedValue(1)

        await getCourseVideos('course_1', null, 10, 0)

        expect(mockCourseVideoFindMany).toHaveBeenCalledWith({
            where: { courseId: 'course_1' },
            orderBy: { position: 'asc' },
            take: 10,
            skip: 0,
            include: { video: { include: { userProgress: { take: 0 } } } },
        })
        expect(mockCourseVideoCount).toHaveBeenCalledWith({ where: { courseId: 'course_1' } })
    })

    it('passes non-null userId → user-scoped include to findMany', async () => {
        mockCourseVideoFindMany.mockResolvedValue([mockCourseVideo([])])
        mockCourseVideoCount.mockResolvedValue(1)

        await getCourseVideos('course_1', 'clerk_123', 10, 0)

        expect(mockCourseVideoFindMany).toHaveBeenCalledWith({
            where: { courseId: 'course_1' },
            orderBy: { position: 'asc' },
            take: 10,
            skip: 0,
            include: {
                video: {
                    include: {
                        userProgress: {
                            where: { user: { clerkUserId: 'clerk_123' } },
                            take: 1,
                        },
                    },
                },
            },
        })
        expect(mockCourseVideoCount).toHaveBeenCalledWith({ where: { courseId: 'course_1' } })
    })

    it('maps userProgress data into each video result', async () => {
        mockCourseVideoFindMany.mockResolvedValue([
            mockCourseVideo([{ watched: true, progressSecs: 60 }]),
        ])
        mockCourseVideoCount.mockResolvedValue(1)

        const { videos } = await getCourseVideos('course_1', 'clerk_123', 10, 0)

        expect(videos[0].watched).toBe(true)
        expect(videos[0].progressSecs).toBe(60)
    })
})

describe('getCourseVideoById', () => {
    it('returns null when the course video does not exist', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(null)
        expect(await getCourseVideoById('course_1', 'v_missing', 'clerk_123')).toBeNull()
    })

    it('passes null userId → { take: 0 } include to findFirst', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(mockCourseVideo([]))

        await getCourseVideoById('course_1', 'v1', null)

        expect(mockCourseVideoFindFirst).toHaveBeenCalledWith({
            where: { courseId: 'course_1', videoId: 'v1' },
            include: { video: { include: { userProgress: { take: 0 } } } },
        })
    })

    it('passes non-null userId → user-scoped include to findFirst', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(mockCourseVideo([]))

        await getCourseVideoById('course_1', 'v1', 'clerk_123')

        expect(mockCourseVideoFindFirst).toHaveBeenCalledWith({
            where: { courseId: 'course_1', videoId: 'v1' },
            include: {
                video: {
                    include: {
                        userProgress: {
                            where: { user: { clerkUserId: 'clerk_123' } },
                            take: 1,
                        },
                    },
                },
            },
        })
    })

    it('maps userProgress data from the found video', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(
            mockCourseVideo([{ watched: true, progressSecs: 90 }]),
        )

        const result = await getCourseVideoById('course_1', 'v1', 'clerk_123')

        expect(result?.watched).toBe(true)
        expect(result?.progressSecs).toBe(90)
    })
})
