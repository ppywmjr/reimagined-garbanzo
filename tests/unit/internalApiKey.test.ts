import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Request, Response, NextFunction } from 'express'
import { internalApiKey } from '../../src/middleware/internalApiKey'

const SECRET = 'test-internal-secret'

describe('internalApiKey middleware', () => {
  let next: ReturnType<typeof vi.fn>
  let json: ReturnType<typeof vi.fn>
  let status: ReturnType<typeof vi.fn>
  let res: Response

  beforeEach(() => {
    process.env.INTERNAL_API_SECRET = SECRET
    next = vi.fn()
    json = vi.fn()
    status = vi.fn().mockReturnValue({ json })
    res = { status } as unknown as Response
  })

  function makeReq(key?: string): Request {
    return {
      headers: key !== undefined ? { 'x-internal-api-key': key } : {},
    } as unknown as Request
  }

  it('calls next() when the correct key is provided', () => {
    internalApiKey(makeReq(SECRET), res, next as NextFunction)

    expect(next).toHaveBeenCalledOnce()
    expect(status).not.toHaveBeenCalled()
  })

  it('returns 401 with error body when the header is missing', () => {
    internalApiKey(makeReq(), res, next as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Unauthorised' })
  })

  it('returns 401 with error body when the key is wrong', () => {
    internalApiKey(makeReq('wrong-key'), res, next as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(401)
    expect(json).toHaveBeenCalledWith({ error: 'Unauthorised' })
  })

  it('returns 401 when INTERNAL_API_SECRET env var is not set', () => {
    delete process.env.INTERNAL_API_SECRET
    internalApiKey(makeReq(SECRET), res, next as NextFunction)

    expect(next).not.toHaveBeenCalled()
    expect(status).toHaveBeenCalledWith(401)
  })
})
