import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getAuthWithBypass } from '../../src/lib/auth-helper.js'
import { getAuth } from '@clerk/express'
import { Request } from 'express'

// Mocking @clerk/express
vi.mock('@clerk/express', () => ({
    getAuth: vi.fn(),
}))

describe('getAuthWithBypass', () => {
    const originalEnv = process.env

    beforeEach(() => {
        vi.resetAllMocks()
        process.env = { ...originalEnv }
    })

    it('should return real auth when bypass is not enabled', () => {
        process.env.NODE_ENV = 'production'
        process.env.BYPASS_AUTH = 'false'

        const mockAuth = {
            userId: 'user-123',
            isAuthenticated: true,
        }
            ; (getAuth as any).mockReturnValue(mockAuth)

        const mockReq = {} as Request

        const result = getAuthWithBypass(mockReq)

        expect(result.userId).toBe('user-123')
        expect(result.isAuthenticated).toBe(true)
    })

    it('should return real auth when NODE_ENV is production even if BYPASS_AUTH is true', () => {
        process.env.NODE_ENV = 'production'
        process.env.BYPASS_AUTH = 'true'

        const mockAuth = {
            userId: 'user-123',
            isAuthenticated: true,
        }
            ; (getAuth as any).mockReturnValue(mockAuth)

        const mockReq = {} as Request

        const result = getAuthWithBypass(mockReq)

        expect(result.userId).toBe('user-123')
        expect(result.isAuthenticated).toBe(true)
    })

    it('should return bypass user when BYPASS_AUTH is true and NODE_ENV is not production', () => {
        process.env.NODE_ENV = 'development'
        process.env.BYPASS_AUTH = 'true'
        const bypassUserId = 'bypass-user-id'
        process.env.BYPASS_USER_ID = bypassUserId

        const mockAuth = {
            userId: 'real-user',
            isAuthenticated: false,
        }
            ; (getAuth as any).mockReturnValue(mockAuth)

        const mockReq = {} as Request

        const result = getAuthWithBypass(mockReq)

        expect(result.userId).toBe(bypassUserId)
        expect(result.isAuthenticated).toBe(true)
    })

    it('should return default bypass user if BYPASS_USER_ID is not provided', () => {
        process.env.NODE_ENV = 'development'
        process.env.BYPASS_AUTH = 'true'
        delete process.env.BYPASS_USER_ID

        const mockAuth = {
            userId: 'real-user',
            isAuthenticated: false,
        }
            ; (getAuth as any).mockReturnValue(mockAuth)

        const mockReq = {} as Request

        const result = getAuthWithBypass(mockReq)

        expect(result.userId).toBe('dev-user-id')
        expect(result.isAuthenticated).toBe(true)
    })

    it('should return null userId and false isAuthenticated when auth is not authenticated', () => {
        process.env.NODE_ENV = 'production'
        process.env.BYPASS_AUTH = 'false'

        const mockAuth = {
            userId: null,
            isAuthenticated: false,
        }
            ; (getAuth as any).mockReturnValue(mockAuth)

        const mockReq = {} as Request

        const result = getAuthWithBypass(mockReq)

        expect(result.userId).toBeNull()
        expect(result.isAuthenticated).toBe(false)
    })
})
