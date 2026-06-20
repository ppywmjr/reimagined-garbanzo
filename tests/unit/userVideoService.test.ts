import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import { userHasAccessToVideo, upsertVideoProgress } from '../../src/services/userVideoService.js'

const mockCourseVideoFindFirst = vi.fn()
const mockUserFindUniqueOrThrow = vi.fn()
const mockUserVideoProgressUpsert = vi.fn()

beforeEach(() => {
    vi.mocked(getPrismaClient).mockReturnValue({
        courseVideo: { findFirst: mockCourseVideoFindFirst },
        user: { findUniqueOrThrow: mockUserFindUniqueOrThrow },
        userVideoProgress: { upsert: mockUserVideoProgressUpsert },
    } as any)
    vi.clearAllMocks()
    vi.mocked(getPrismaClient).mockReturnValue({
        courseVideo: { findFirst: mockCourseVideoFindFirst },
        user: { findUniqueOrThrow: mockUserFindUniqueOrThrow },
        userVideoProgress: { upsert: mockUserVideoProgressUpsert },
    } as any)
})

describe('userHasAccessToVideo', () => {
    it('returns true when the user has an active subscription granting access', async () => {
        mockCourseVideoFindFirst.mockResolvedValue({ id: 'cv1', videoId: 'v1' })

        const result = await userHasAccessToVideo('clerk_123', 'v1')

        expect(result).toBe(true)
        expect(mockCourseVideoFindFirst).toHaveBeenCalledWith(
            expect.objectContaining({ where: expect.objectContaining({ videoId: 'v1' }) }),
        )
    })

    it('returns false when no matching course video is found', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(null)

        const result = await userHasAccessToVideo('clerk_123', 'v1')

        expect(result).toBe(false)
    })
})

describe('upsertVideoProgress', () => {
    const progressResult = { videoId: 'v1', watched: true, progressSecs: 120, updatedAt: new Date() }

    it('returns null when the courseVideo does not exist', async () => {
        mockCourseVideoFindFirst.mockResolvedValue(null)

        const result = await upsertVideoProgress('clerk_123', 'course_1', 'v1', { watched: true })

        expect(result).toBeNull()
        expect(mockUserFindUniqueOrThrow).not.toHaveBeenCalled()
        expect(mockUserVideoProgressUpsert).not.toHaveBeenCalled()
    })

    it('upserts progress with provided data when courseVideo exists', async () => {
        mockCourseVideoFindFirst.mockResolvedValue({ id: 'cv1' })
        mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user_uuid' })
        mockUserVideoProgressUpsert.mockResolvedValue(progressResult)

        const result = await upsertVideoProgress('clerk_123', 'course_1', 'v1', {
            watched: true,
            progressSecs: 120,
        })

        expect(mockUserFindUniqueOrThrow).toHaveBeenCalledWith({ where: { clerkUserId: 'clerk_123' } })
        expect(mockUserVideoProgressUpsert).toHaveBeenCalledWith({
            where: { userId_videoId: { userId: 'user_uuid', videoId: 'v1' } },
            update: { watched: true, progressSecs: 120 },
            create: { userId: 'user_uuid', videoId: 'v1', watched: true, progressSecs: 120 },
            select: { videoId: true, watched: true, progressSecs: true, updatedAt: true },
        })
        expect(result).toEqual(progressResult)
    })

    it('defaults watched to false and progressSecs to 0 in create when not provided', async () => {
        mockCourseVideoFindFirst.mockResolvedValue({ id: 'cv1' })
        mockUserFindUniqueOrThrow.mockResolvedValue({ id: 'user_uuid' })
        mockUserVideoProgressUpsert.mockResolvedValue(progressResult)

        await upsertVideoProgress('clerk_123', 'course_1', 'v1', {})

        expect(mockUserVideoProgressUpsert).toHaveBeenCalledWith(
            expect.objectContaining({
                create: expect.objectContaining({ watched: false, progressSecs: 0 }),
            }),
        )
    })
})
