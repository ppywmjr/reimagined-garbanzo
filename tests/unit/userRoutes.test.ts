import { vi, describe, it, expect } from 'vitest'
import { getAuth, clerkClient } from '@clerk/express'
import supertest from 'supertest'
import app from '../../src/app.js'
import * as userService from '../../src/services/userService.js'
import { request } from '../helpers/api.js'

vi.mock('../../src/services/userService.js', () => ({
    createUser: vi.fn(),
}))

const clerkUserMock = {
    id: 'clerk_123',
    emailAddresses: [
        { id: 'email-1', emailAddress: 'test@example.com' },
        { id: 'email-2', emailAddress: 'other@example.com' },
    ],
    primaryEmailAddressId: 'email-1',
}

describe('POST /signup', () => {
    it('returns 401 when not authenticated', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: null, isAuthenticated: false } as any)

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'test@example.com',
        })

        expect(res.status).toBe(401)
        expect(res.body).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns 401 when authenticated but userId is missing', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: null, isAuthenticated: true } as any)

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'test@example.com',
        })

        expect(res.status).toBe(401)
        expect(res.body).toEqual({ success: false, error: 'Unauthorized' })
    })

    it('returns 400 when body validation fails', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'clerk_123', isAuthenticated: true } as any)

        const res = await request(app).post('/signup').send({
            clerkUserId: '',
            email: 'not-an-email',
        })

        expect(res.status).toBe(400)
        expect(res.body.success).toBe(false)
    })

    it('returns 403 when clerkUserId does not match auth userId', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'clerk_456', isAuthenticated: true } as any)

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'test@example.com',
        })

        expect(res.status).toBe(403)
        expect(res.body).toEqual({ success: false, error: 'Forbidden' })
    })

    it('returns 403 when email does not match Clerk primary email', async () => {
        vi.mocked(getAuth).mockReturnValue({ userId: 'clerk_123', isAuthenticated: true } as any)
        vi.mocked(clerkClient.users.getUser).mockResolvedValue(clerkUserMock as any)

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'other@example.com',
        })

        expect(res.status).toBe(403)
        expect(res.body).toEqual({ success: false, error: 'Forbidden' })
    })

    it('creates the user and returns 201 on success', async () => {
        const createdUser = { id: 'db-uuid', clerkUserId: 'clerk_123', email: 'test@example.com', displayName: null, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(getAuth).mockReturnValue({ userId: 'clerk_123', isAuthenticated: true } as any)
        vi.mocked(clerkClient.users.getUser).mockResolvedValue(clerkUserMock as any)
        vi.mocked(userService.createUser).mockResolvedValue({ user: createdUser, created: true })

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'test@example.com',
        })

        expect(res.status).toBe(201)
        expect(res.body.success).toBe(true)
        expect(res.body.data.id).toBe('db-uuid')
        expect(res.body.data.clerkUserId).toBe('clerk_123')
        expect(res.body.data.email).toBe('test@example.com')
    })

    it('returns 200 when user already exists', async () => {
        const existingUser = { id: 'db-uuid', clerkUserId: 'clerk_123', email: 'test@example.com', displayName: null, createdAt: new Date(), updatedAt: new Date() }
        vi.mocked(getAuth).mockReturnValue({ userId: 'clerk_123', isAuthenticated: true } as any)
        vi.mocked(clerkClient.users.getUser).mockResolvedValue(clerkUserMock as any)
        vi.mocked(userService.createUser).mockResolvedValue({ user: existingUser, created: false })

        const res = await request(app).post('/signup').send({
            clerkUserId: 'clerk_123',
            email: 'test@example.com',
        })

        expect(res.status).toBe(200)
        expect(res.body.success).toBe(true)
    })
})
