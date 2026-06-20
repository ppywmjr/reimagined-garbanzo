import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import { getCourseVideos, getCourseVideoById } from '../../src/services/courseService.js'

const mockFindMany = vi.fn()
const mockCount = vi.fn()
const mockFindFirst = vi.fn()

function applyMock() {
    vi.mocked(getPrismaClient).mockReturnValue({
        courseVideo: { findMany: mockFindMany, count: mockCount, findFirst: mockFindFirst },
    } as any)
}

beforeEach(() => {
    vi.clearAllMocks()
    applyMock()
})

const mockCourseVideo = {
    video: {
        id: 'v1',
        title: 'Video One',
        url: 'https://example.com/v1',
        thumbnail: 'https://example.com/v1.jpg',
        userProgress: [],
    },
}

describe('getCourseVideos', () => {
    it('uses { take: 0 } for userProgress when clerkUserId is null', async () => {
        mockFindMany.mockResolvedValue([mockCourseVideo])
        mockCount.mockResolvedValue(1)

        const result = await getCourseVideos('course_1', null, 10, 0)

        expect(mockFindMany).toHaveBeenCalledWith(
            expect.objectContaining({
                include: { video: { include: { userProgress: { take: 0 } } } },
            }),
        )
        expect(result.videos[0]).toEqual({
            id: 'v1',
            title: 'Video One',
            url: 'https://example.com/v1',
            thumbnail: 'https://example.com/v1.jpg',
            watched: false,
            progressSecs: 0,
        })
    })
})

describe('getCourseVideoById', () => {
    it('uses { take: 0 } for userProgress when clerkUserId is null', async () => {
        mockFindFirst.mockResolvedValue(mockCourseVideo)

        const result = await getCourseVideoById('course_1', 'v1', null)

        expect(mockFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({
                include: { video: { include: { userProgress: { take: 0 } } } },
            }),
        )
        expect(result).toEqual({
            id: 'v1',
            title: 'Video One',
            url: 'https://example.com/v1',
            thumbnail: 'https://example.com/v1.jpg',
            watched: false,
            progressSecs: 0,
        })
    })

    it('returns null when the course video does not exist', async () => {
        mockFindFirst.mockResolvedValue(null)

        const result = await getCourseVideoById('course_1', 'v_missing', 'clerk_123')

        expect(result).toBeNull()
    })
})
