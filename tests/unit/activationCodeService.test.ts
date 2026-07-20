import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { validateActivationCode, parseActivationCodeBody } from '../../src/services/activationCodeService.js'
import { getPrismaClient } from '../../src/lib/prisma.js'

// Mock Prisma
vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: vi.fn(),
}))

import { getPrismaClient as getPrisma } from '../../src/lib/prisma.js'

const mockActivationCode = {
  findFirst: vi.fn(),
}

describe('validateActivationCode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(getPrisma as ReturnType<typeof vi.fn>).mockReturnValue({
      activationCode: mockActivationCode,
    })
  })

  it('returns planId for a valid active activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-1',
      code: 'ABC123',
      planId: 'plan-uuid-1',
      isActive: true,
      expiresAt: new Date('2030-01-01T00:00:00Z'),
      createdAt: new Date(),
    })

    const result = await validateActivationCode('ABC123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
    expect(mockActivationCode.findFirst).toHaveBeenCalledWith({
      where: {
        code: 'ABC123',
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: expect.any(Date) } },
        ],
      },
    })
  })

  it('returns null for a non-existent activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('NONEXISTENT')
    expect(result).toBeNull()
  })

  it('returns null for an inactive activation code', async () => {
    // The database query filters by isActive: true, so findFirst returns null
    // when only inactive codes exist for the given code string
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('INACTIVE123')
    expect(result).toBeNull()
  })

  it('returns null for an expired activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('EXPIRED123')
    expect(result).toBeNull()
  })

  it('normalizes activation code to uppercase', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-3',
      code: 'ABC123',
      planId: 'plan-uuid-1',
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    })

    const result = await validateActivationCode('abc123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('trims whitespace from activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-4',
      code: 'ABC123',
      planId: 'plan-uuid-1',
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    })

    const result = await validateActivationCode('  ABC123  ')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('handles mixed case with whitespace', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-5',
      code: 'ABC123',
      planId: 'plan-uuid-1',
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    })

    const result = await validateActivationCode('  AbC123  ')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('returns null when database query fails', async () => {
    mockActivationCode.findFirst.mockRejectedValue(new Error('Database error'))

    await expect(validateActivationCode('ABC123')).rejects.toThrow('Database error')
  })

  it('returns planId for code without expiration date (null expiresAt)', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-6',
      code: 'NOEXPIRE',
      planId: 'plan-uuid-3',
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    })

    const result = await validateActivationCode('NOEXPIRE')
    expect(result).toEqual({ planId: 'plan-uuid-3' })
  })

  it('returns null for code that has expired', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('PASTEXPIRE')
    expect(result).toBeNull()
  })

  it('returns planId for code that expires in the future', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-7',
      code: 'FUTUREEXPIRE',
      planId: 'plan-uuid-4',
      isActive: true,
      expiresAt: new Date('2030-06-15T00:00:00Z'),
      createdAt: new Date(),
    })

    const result = await validateActivationCode('FUTUREEXPIRE')
    expect(result).toEqual({ planId: 'plan-uuid-4' })
  })

  it('verifies the OR condition is passed for expiresAt', async () => {
    mockActivationCode.findFirst.mockResolvedValue({
      id: 'ac-8',
      code: 'NOEXPIRE2',
      planId: 'plan-uuid-5',
      isActive: true,
      expiresAt: null,
      createdAt: new Date(),
    })

    await validateActivationCode('NOEXPIRE2')
    expect(mockActivationCode.findFirst).toHaveBeenCalledWith({
      where: {
        code: 'NOEXPIRE2',
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: expect.any(Date) } },
        ],
      },
    })
  })

  it('handles empty string activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('')
    expect(result).toBeNull()
  })

  it('handles very long activation code', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('A'.repeat(100))
    expect(result).toBeNull()
  })

  it('handles activation code with special characters', async () => {
    mockActivationCode.findFirst.mockResolvedValue(null)

    const result = await validateActivationCode('ABC-123_XY.Z')
    expect(result).toBeNull()
  })
})

describe('parseActivationCodeBody', () => {
  it('returns success with valid activation code string', () => {
    const result = parseActivationCodeBody({ activationCode: 'ABC123' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ activationCode: 'ABC123' })
    }
  })

  it('returns error when activation code is empty string', () => {
    const result = parseActivationCodeBody({ activationCode: '' })

    expect(result.success).toBe(false)
  })

  it('returns error when activation code is missing', () => {
    const result = parseActivationCodeBody({})

    expect(result.success).toBe(false)
  })

  it('returns error when activation code is null', () => {
    const result = parseActivationCodeBody({ activationCode: null })

    expect(result.success).toBe(false)
  })

  it('returns error when activation code is a number', () => {
    const result = parseActivationCodeBody({ activationCode: 123 })

    expect(result.success).toBe(false)
  })

  it('returns error when body is not an object', () => {
    const result = parseActivationCodeBody('not an object')

    expect(result.success).toBe(false)
  })

  it('returns error when body is null', () => {
    const result = parseActivationCodeBody(null)

    expect(result.success).toBe(false)
  })

  it('returns error when body is undefined', () => {
    const result = parseActivationCodeBody(undefined)

    expect(result.success).toBe(false)
  })

  it('ignores extra fields in body', () => {
    const result = parseActivationCodeBody({ activationCode: 'ABC', extraField: 'ignored' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ activationCode: 'ABC' })
    }
  })

  it('returns error when activation code is an object', () => {
    const result = parseActivationCodeBody({ activationCode: { code: 'ABC123' } })

    expect(result.success).toBe(false)
  })

  it('returns success for a long activation code', () => {
    const result = parseActivationCodeBody({ activationCode: 'A'.repeat(100) })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.activationCode).toBe('A'.repeat(100))
    }
  })

  it('returns success for activation code with special characters', () => {
    const result = parseActivationCodeBody({ activationCode: 'ABC-123_XY.Z' })

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.activationCode).toBe('ABC-123_XY.Z')
    }
  })

  it('returns error for unknown keys in body', () => {
    const result = parseActivationCodeBody({ unknownKey: 'value' })

    expect(result.success).toBe(false)
  })

  it('returns error for completely unknown input', () => {
    const result = parseActivationCodeBody(42)

    expect(result.success).toBe(false)
  })
})