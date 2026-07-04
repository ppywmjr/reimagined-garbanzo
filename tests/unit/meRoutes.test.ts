import { vi, describe, it, expect, beforeEach } from 'vitest'
import { getAuth } from '@clerk/express'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as courseService from '../../src/services/courseService.js'
import * as userCoursesService from '../../src/services/userCoursesService.js'
import * as userVideoService from '../../src/services/userVideoService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/courseService.js', () => ({
    getCourseVideos: vi.fn(),
    getCourseVideoById: vi.fn(),
}))

vi.mock('../../src/services/userCoursesService.js', () => ({
    getUserCourses: vi.fn(),
    userHasAccessToCourse: vi.fn(),
}))

vi.mock('../../src/services/userVideoService.js', () => ({
    upsertVideoProgress: vi.fn(),
}))

vi.mock('../../src/services/userService.js', () => ({
    getUserProfile: vi.fn(),
}))

vi.mock('../../src/services/planService.js', () => ({
    getPlanById: vi.fn(),
}))

vi.mock('../../src/services/stripeService.js', () => ({
    createCheckoutSession: vi.fn(),
}))

const COURSE_ID = '123e4567-e89b-12d3-a456-426614174000'
const VIDEO_ID = '987fcdeb-51a2-43d6-be46-716614174001'

describe('meRoutes /me auth middleware', () => {
    it('returns 401 when the request is not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: false } as any)

        const res = await request(app).get('/me/courses')

        expect(res.status).toBe(401)
        expect(res.body).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns 401 when authenticated but userId is missing', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: true } as any)

        const res = await request(app).get('/me/courses')

        expect(res.status).toBe(401)
        expect(res.body).toEqual({ success: false, error: 'Unauthorized' })
    })
})

describe('GET /me/courses', () => {
    it('returns user courses with pagination', async () => {
        const courses = [{ id: 'course-1', name: 'Test Course' }]
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.getUserCourses).mockResolvedValue({ courses, total: 1 })

        const res = await request(app).get('/me/courses')

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(courses)
        expect(res.body.pagination).toEqual({
            total: 1,
            limit: expect.any(Number),
            offset: expect.any(Number),
            hasMore: false,
        })
        expect(userCoursesService.getUserCourses).toHaveBeenCalledWith('user-123', expect.any(Number), expect.any(Number))
    })

    it('mutates hasMore to true when there are more results', async () => {
        const courses = [{ id: 'course-1', name: 'Test Course' }]
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.getUserCourses).mockResolvedValue({ courses, total: 10 })

        const res = await request(app).get('/me/courses')

        expect(res.body.pagination.hasMore).toBe(true)
    })

    it('hasMore is true when there are more videos', async () => {
        const videos = [{ id: 'video-1', title: 'Test Video' }]
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 10 })

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos`)

        expect(res.body.pagination.hasMore).toBe(true)
    })
})

describe('GET /me/courses/:id/videos', () => {
    it('returns 400 for invalid course ID', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).get('/me/courses/not-a-uuid/videos')

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 403 when user does not have access', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(false)

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(403)
        expect(res.body).toEqual({ success: false, error: 'Forbidden' })
    })

    it('returns videos when user has access', async () => {
        const videos = [{ id: 'video-1', title: 'Test Video' }]
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(courseService.getCourseVideos).mockResolvedValue({ videos, total: 1 })

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(videos)
        expect(res.body.pagination.hasMore).toBe(false)
        expect(userCoursesService.userHasAccessToCourse).toHaveBeenCalledWith('user-123', COURSE_ID)
        expect(courseService.getCourseVideos).toHaveBeenCalledWith(COURSE_ID, 'user-123', expect.any(Number), expect.any(Number))
    })
})

describe('GET /me/courses/:id/videos/:videoId', () => {
    it('returns 400 for invalid course ID', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).get('/me/courses/not-a-uuid/videos/' + VIDEO_ID)

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 400 for invalid video ID', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos/not-a-uuid`)

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid video ID format' })
    })

    it('returns 403 when user does not have access', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(false)

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}`)

        expect(res.status).toBe(403)
        expect(res.body).toEqual({ success: false, error: 'Forbidden' })
    })

    it('returns 404 when video is not found', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(courseService.getCourseVideoById).mockResolvedValue(null)

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}`)

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ success: false, error: 'Video not found' })
    })

    it('returns the video when found', async () => {
        const video = { id: VIDEO_ID, title: 'Test Video' }
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(courseService.getCourseVideoById).mockResolvedValue(video)

        const res = await request(app).get(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}`)

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(video)
    })
})

describe('POST /me/courses/:id/videos/:videoId/progress', () => {
    it('returns 400 for invalid course ID', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).post('/me/courses/not-a-uuid/videos/' + VIDEO_ID + '/progress').send({ watched: true })

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid course ID format' })
    })

    it('returns 400 for invalid video ID', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).post(`/me/courses/${COURSE_ID}/videos/not-a-uuid/progress`).send({ watched: true })

        expect(res.status).toBe(400)
        expect(res.body).toEqual({ success: false, error: 'Invalid video ID format' })
    })

    it('returns 400 when body validation fails', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)

        const res = await request(app).post(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}/progress`).send({ watched: 'not-a-boolean' })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 403 when user does not have access', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(false)

        const res = await request(app).post(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}/progress`).send({ watched: true })

        expect(res.status).toBe(403)
        expect(res.body).toEqual({ success: false, error: 'Forbidden' })
    })

    it('returns 404 when progress is not found', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(userVideoService.upsertVideoProgress).mockResolvedValue(null)

        const res = await request(app).post(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}/progress`).send({ watched: true })

        expect(res.status).toBe(404)
        expect(res.body).toEqual({ success: false, error: 'Video not found' })
    })

    it('returns progress on success', async () => {
        const progress = { id: 'progress-1', watched: true, progressSecs: 60 }
        vi.mocked(getAuth).mockReturnValue({ userId: 'user-123', isAuthenticated: true } as any)
        vi.mocked(userCoursesService.userHasAccessToCourse).mockResolvedValue(true)
        vi.mocked(userVideoService.upsertVideoProgress).mockResolvedValue(progress)

        const res = await request(app).post(`/me/courses/${COURSE_ID}/videos/${VIDEO_ID}/progress`).send({ watched: true })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
        expect(res.body.data).toEqual(progress)
    })
})

