import { vi, describe, it, expect } from 'vitest'
import { getAuth } from '@clerk/express'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as courseService from '../../src/services/courseService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/courseService.js', () => ({
    getAllCourses: vi.fn(),
    getCourseById: vi.fn(),
    getCourseVideos: vi.fn(),
    getCourseVideoById: vi.fn(),
}))

const TEST_API_KEY = 'test-internal-api-key'
const COURSE_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('GET /courses', () => {
    it('returns courses with pagination', async () => {
        const courses = [{ id: 'course-1', name: 'Test Course' }]
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
        const courses = [{ id: 'course-1', name: 'Test Course' }]
        vi.mocked(courseService.getAllCourses).mockResolvedValue({ courses, total: 10 })

        const res = await request(app).get('/courses')

        expect(res.body.pagination.hasMore).toBe(true)
    })
})

describe('GET /courses/:id', () => {
    it('returns the course when found', async () => {
        const course = { id: COURSE_ID, name: 'Test Course' }
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
})
