import { vi, describe, it, expect } from 'vitest'
import { getAuth } from '@clerk/express'
import supertest from 'supertest'
import app from '../../src/app.js'

const TEST_API_KEY = 'test-internal-api-key'

describe('meRoutes /me auth middleware', () => {
    it('returns 401 when the request is not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValueOnce({ userId: null, isAuthenticated: false } as any)

        const res = await supertest(app)
            .get('/me/courses')
            .set('x-internal-api-key', TEST_API_KEY)

        expect(res.status).toBe(401)
        expect(res.body).toEqual({ success: false, error: 'Unauthorized' })
    })
})
