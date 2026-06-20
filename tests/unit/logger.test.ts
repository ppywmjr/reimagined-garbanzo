import { describe, it, expect, vi } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { logger } from '../../src/middleware/logger.js'

describe('logger middleware', () => {
    it('should call next() and log to console', async () => {
        const req = {
            method: 'GET',
            originalUrl: '/test-url',
        } as Request
        const res = {
            statusCode: 200,
            on: vi.fn((event: string, callback: () => void) => {
                if (event === 'finish') {
                    callback()
                }
            }),
        } as unknown as Response

        const next = vi.fn()
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })

        logger(req as Request, res as Response, next as NextFunction)

        expect(next).toHaveBeenCalled()

        // Wait for the 'finish' event to be triggered
        await new Promise((resolve) => setTimeout(resolve, 10))

        expect(consoleSpy).toHaveBeenCalledWith(
            expect.stringContaining('GET /test-url 200 -'),
        )

        consoleSpy.mockRestore()
    })
})
