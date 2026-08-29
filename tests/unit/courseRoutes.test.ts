import { vi, describe, it, expect } from 'vitest'
import type { SessionAuthObject } from '@clerk/express'
import app from '../../src/app.js'
import * as courseService from '../../src/services/courseService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/courseService.js', () => ({
    getAllCourses: vi.fn(),
    getCourseById: vi.fn(),
    getCourseVideos: vi.fn(),
    getCourseVideoById: vi.fn(),
    createCourse: vi.fn(),
    patchCourse: vi.fn(),
}))

vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(),
    clerkMiddleware: vi.fn(() => async (_req: any, res: any, next: any) => next()),
}))

vi.mock('../../src/lib/prisma.js', () => ({
    getPrismaClient: vi.fn(() => ({
        user: {
            findUnique: vi.fn(),
        },
    })),
}))

const { getAuth } = await import('@clerk/express')
const { getPrismaClient } = await import('../../src/lib/prisma.js')

const COURSE_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('POST /courses', () => {
    beforeEach(() => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValue({
            user: {
                findUnique: vi.fn().mockResolvedValue({ superAdmin: true }),
            },
        } as any)
    })

    it('returns 401 when the request is not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: false } as any)

        const res = await request(app).post('/courses').send({
            title: 'New Course',
        })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Unauthorized')
    })

    it('returns 403 when the user is not a super admin', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValueOnce({
            user: {
                findUnique: vi.fn().mockResolvedValue({ superAdmin: false }),
            },
        } as any)

        const res = await request(app).post('/courses').send({
            title: 'New Course',
        })

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Forbidden')
    })

    it('returns 403 when the user does not exist in the database', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValueOnce({
            user: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
        } as any)

        const res = await request(app).post('/courses').send({
            title: 'New Course',
        })

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Forbidden')
    })

    it('creates a course and returns 201 on success', async () => {
        const createdCourse = { id: 'course-uuid', title: 'New Course', description: 'Desc', thumbnail: null, sortOrder: 0, isPublished: false }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'New Course',
            description: 'Desc',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.id).toBe('course-uuid')
        expect(res.body.data.title).toBe('New Course')
        expect(res.body.data.description).toBe('Desc')
    })

    it('returns 400 when body validation fails - missing title', async () => {
        const res = await request(app).post('/courses').send({ description: 'No title' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - empty title', async () => {
        const res = await request(app).post('/courses').send({ title: '' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - title too long', async () => {
        const res = await request(app).post('/courses').send({ title: 'a'.repeat(201) })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - invalid thumbnail URL', async () => {
        const res = await request(app).post('/courses').send({ title: 'Course', thumbnail: 'not-a-url' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - sortOrder is negative', async () => {
        const res = await request(app).post('/courses').send({ title: 'Course', sortOrder: -1 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - sortOrder is not an integer', async () => {
        const res = await request(app).post('/courses').send({ title: 'Course', sortOrder: 1.5 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('accepts valid isPublished boolean true', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Published Course', description: null, thumbnail: null, sortOrder: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Published Course',
            isPublished: true,
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('accepts valid thumbnail URL', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Thumbnail Course', description: null, thumbnail: 'https://example.com/thumb.jpg', sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Thumbnail Course',
            thumbnail: 'https://example.com/thumb.jpg',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
    })

    it('accepts sortOrder of 0', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Ordered Course', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Ordered Course',
            sortOrder: 0,
        })

        expect(res.status).toBe(201)
    })

    it('accepts sortOrder greater than 0', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Ordered Course', description: null, thumbnail: null, sortOrder: 10, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Ordered Course',
            sortOrder: 10,
        })

        expect(res.status).toBe(201)
    })

    it('uses default sortOrder of 0 when not provided', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Default Order Course', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Default Order Course',
        })

        expect(res.status).toBe(201)
        expect(res.body.data.sortOrder).toBe(0)
    })

    it('uses default isPublished false when not provided', async () => {
        const createdCourse = { id: 'course-uuid', title: 'Unpublished Course', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.createCourse).mockResolvedValue(createdCourse as any)

        const res = await request(app).post('/courses').send({
            title: 'Unpublished Course',
        })

        expect(res.status).toBe(201)
        expect(res.body.data.isPublished).toBe(false)
    })
})

describe('GET /courses', () => {
    it('returns courses with pagination', async () => {
        const courses = [{ id: 'course-1', title: 'Test Course', description: null, thumbnail: null, sortOrder: 0 }]
        vi.mocked(courseService.getAllCourses).mockResolvedValue({ courses, total: 1 })

        const res = await request(app).get('/courses')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(courses)
        expect(res.body.pagination).toEqual({
            total: 1,
            limit: expect.any(Number),
            offset: expect.any(Number),
            hasMore: false,
        })
    })

    it('mutates hasMore to true when there are more results', async () => {
        const courses = [{ id: 'course-1', title: 'Test Course', description: null, thumbnail: null, sortOrder: 0 }]
        vi.mocked(courseService.getAllCourses).mockResolvedValue({ courses, total: 10 })

        const res = await request(app).get('/courses')

        expect(res.body.pagination.hasMore).toBe(true)
    })

    it('returns empty array when no courses exist', async () => {
        vi.mocked(courseService.getAllCourses).mockResolvedValue({ courses: [], total: 0 })

        const res = await request(app).get('/courses')

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual([])
        expect(res.body.pagination.total).toBe(0)
        expect(res.body.pagination.hasMore).toBe(false)
    })

    it('supports custom pagination query params', async () => {
        const courses = [{ id: 'course-2', title: 'Second Course', description: null, thumbnail: null, sortOrder: 1 }]
        vi.mocked(courseService.getAllCourses).mockResolvedValue({ courses, total: 100 })

        const res = await request(app).get('/courses?limit=5&offset=10')

        expect(res.status).toBe(200)
        expect(courseService.getAllCourses).toHaveBeenCalledWith(5, 10)
    })
})

describe('GET /courses/:id', () => {
    it('returns the course when found', async () => {
        const course = { id: COURSE_ID, title: 'Test Course', description: 'A test course', thumbnail: null, sortOrder: 0 }
        vi.mocked(courseService.getCourseById).mockResolvedValue(course)

        const res = await request(app).get(`/courses/${COURSE_ID}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(course)
    })

    it('returns 404 when course is not found', async () => {
        vi.mocked(courseService.getCourseById).mockResolvedValue(null)

        const res = await request(app).get(`/courses/${COURSE_ID}`)

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ success: false, error: 'Course not found' })
    })

    it('returns 400 for invalid UUID format', async () => {
        const res = await request(app).get('/courses/not-a-uuid')

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('handles trailing slash course route', async () => {
        const res = await request(app).get('/courses/')

        expect(res.status).toBe(200)
    })

    it('returns 400 for UUID with extra characters', async () => {
        const res = await request(app).get('/courses/123e4567-e89b-12d3-a456-426614174000-extra')

        expect(res.status).toBe(400)
    })
})

describe('GET /courses/:id/videos', () => {
    it('returns videos with pagination when user is authenticated', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [
            { id: 'video-1', title: 'Video 1', url: 'https://example.com/video1.mp4', thumbnail: '', watched: true, progressSecs: 60 },
        ]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 1 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(videos)
        expect(res.body.pagination).toEqual({
            total: 1,
            limit: expect.any(Number),
            offset: expect.any(Number),
            hasMore: false,
        })
    })

    it('returns videos without auth when no Clerk user', async () => {
        const mockAuth = { userId: null } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [
            { id: 'video-1', title: 'Video 1', url: 'https://example.com/video1.mp4', thumbnail: '', watched: false, progressSecs: 0 },
        ]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 1 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('passes userId null when auth is not available', async () => {
        const mockAuth = { userId: null } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [{ id: 'video-1', title: 'Video 1', url: '', thumbnail: '', watched: false, progressSecs: 0 }]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 1 })

        await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(courseService.getCourseVideos).toHaveBeenCalledWith(
            COURSE_ID,
            null,
            expect.any(Number),
            expect.any(Number)
        )
    })

    it('passes userId when auth is available', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [{ id: 'video-1', title: 'Video 1', url: '', thumbnail: '', watched: false, progressSecs: 0 }]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 1 })

        await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(courseService.getCourseVideos).toHaveBeenCalledWith(
            COURSE_ID,
            'user-123',
            expect.any(Number),
            expect.any(Number)
        )
    })

    it('returns hasMore true when there are more videos', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [{ id: 'video-1', title: 'Video 1', url: '', thumbnail: '', watched: false, progressSecs: 0 }]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 10 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(res.body.pagination.hasMore).toBe(true)
    })

    it('returns 400 for invalid UUID format', async () => {
        const res = await request(app).get('/courses/not-a-uuid/videos')

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('supports custom pagination query params', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos: Array<{ id: string; title: string; url: string; thumbnail: string; watched: boolean; progressSecs: number }> = []
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 100 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos?limit=5&offset=10`)

        expect(res.status).toBe(200)
        expect(courseService.getCourseVideos).toHaveBeenCalledWith(
            COURSE_ID,
            'user-123',
            5,
            10
        )
    })

    it('returns empty videos array when no videos exist', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos: [], total: 0 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(200)
        expect(res.body.data).toEqual([])
        expect(res.body.pagination.total).toBe(0)
        expect(res.body.pagination.hasMore).toBe(false)
    })

    it('handles multiple videos correctly', async () => {
        const mockAuth = { userId: 'user-123' } as unknown as SessionAuthObject
        vi.mocked(getAuth).mockReturnValue(mockAuth)
        const videos = [
            { id: 'video-1', title: 'Video 1', url: '', thumbnail: '', watched: false, progressSecs: 0 },
            { id: 'video-2', title: 'Video 2', url: '', thumbnail: '', watched: true, progressSecs: 120 },
            { id: 'video-3', title: 'Video 3', url: '', thumbnail: '', watched: false, progressSecs: 30 },
        ]
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 3 })

        const res = await request(app).get(`/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(200)
        expect(res.body.data).toHaveLength(3)
    })
})

describe('PATCH /courses/:id', () => {
    beforeEach(() => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValue({
            user: {
                findUnique: vi.fn().mockResolvedValue({ superAdmin: true }),
            },
        } as any)
    })

    it('returns 401 when the request is not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: false } as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ title: 'Updated' })

        expect(res.status).toBe(401)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Unauthorized')
    })

    it('returns 403 when the user is not a super admin', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValueOnce({
            user: {
                findUnique: vi.fn().mockResolvedValue({ superAdmin: false }),
            },
        } as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ title: 'Updated' })

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Forbidden')
    })

    it('returns 403 when the user does not exist in the database', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: 'user_test_clerk_123', isAuthenticated: true } as any)
        vi.mocked(getPrismaClient).mockReturnValueOnce({
            user: {
                findUnique: vi.fn().mockResolvedValue(null),
            },
        } as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ title: 'Updated' })

        expect(res.status).toBe(403)
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('Forbidden')
    })

    it('patches a course and returns the updated course', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Updated Course', description: 'New desc', thumbnail: null, sortOrder: 0, isPublished: false }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            title: 'Updated Course',
            description: 'New desc',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data.id).toBe(COURSE_ID)
        expect(res.body.data.title).toBe('Updated Course')
        expect(res.body.data.description).toBe('New desc')
    })

    it('returns 400 for invalid UUID format', async () => {
        const res = await request(app).patch('/courses/not-a-uuid').send({ title: 'Updated' })

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 400 when body validation fails - empty title', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ title: '' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - title too long', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ title: 'a'.repeat(201) })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - invalid thumbnail URL', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ thumbnail: 'not-a-url' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - negative sortOrder', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ sortOrder: -1 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 400 when body validation fails - non-integer sortOrder', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({ sortOrder: 1.5 })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('accepts partial updates - description only', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Original', description: 'Updated desc', thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            description: 'Updated desc',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts partial updates - title only', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'New Title', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            title: 'New Title',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts isPublished update to true', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Course', description: null, thumbnail: null, sortOrder: 0, isPublished: true, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            isPublished: true,
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts isPublished update to false', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Course', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            isPublished: false,
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })

    it('accepts sortOrder update', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Course', description: null, thumbnail: null, sortOrder: 5, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            sortOrder: 5,
        })

        expect(res.status).toBe(200)
        expect(res.body.data.sortOrder).toBe(5)
    })

    it('accepts sortOrder of 0', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Course', description: null, thumbnail: null, sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            sortOrder: 0,
        })

        expect(res.status).toBe(200)
    })

    it('accepts thumbnail update', async () => {
        const updatedCourse = { id: COURSE_ID, title: 'Course', description: null, thumbnail: 'https://example.com/new-thumb.jpg', sortOrder: 0, isPublished: false, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(courseService.patchCourse).mockResolvedValue(updatedCourse as any)

        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({
            thumbnail: 'https://example.com/new-thumb.jpg',
        })

        expect(res.status).toBe(200)
        expect(res.body.data.thumbnail).toBe('https://example.com/new-thumb.jpg')
    })

    it('returns 400 for empty body', async () => {
        const res = await request(app).patch(`/courses/${COURSE_ID}`).send({})

        expect(res.status).toBe(200)
    })

    it('handles invalid course ID with special characters', async () => {
        const res = await request(app).patch('/courses/%40%23%24').send({ title: 'Test' })

        expect(res.status).toBe(400)
    })
})