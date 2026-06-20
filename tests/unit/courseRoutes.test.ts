import { vi, describe, it, expect } from 'vitest'
import { getAuth } from '@clerk/express'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as courseService from '../../src/services/courseService.js'

vi.mock('../../src/services/courseService.js', () => ({
    getAllCourses: vi.fn(),
    getCourseById: vi.fn(),
    getCourseVideos: vi.fn(),
    getCourseVideoById: vi.fn(),
}))

const TEST_API_KEY = 'test-internal-api-key'
const COURSE_ID = '123e4567-e89b-12d3-a456-426614174000'

describe('GET /courses/:id/videos', () => {
    it('passes null as clerkUserId to getCourseVideos when user is not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: undefined } as any)
        vi.mocked(courseService.getCourseVideos).mockResolvedValueOnce({ videos: [], total: 0 })

        const res = await supertest(app)
            .get(`/courses/${COURSE_ID}/videos`)
            .set('x-internal-api-key', TEST_API_KEY)

        expect(res.status).toBe(200)
        expect(courseService.getCourseVideos).toHaveBeenCalledWith(
            COURSE_ID,
            null,
            expect.any(Number),
            expect.any(Number),
        )
    })
})
