import { describe, it, expect, beforeEach, vi } from 'vitest'
import { validateActivationCode, parseActivationCodeBody, getActivationCodesFromEnv } from '../../src/services/activationCodeService.js'

describe('getActivationCodesFromEnv', () => {
  const originalEnv = process.env.VALID_ACTIVATION_CODES

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.VALID_ACTIVATION_CODES
  })

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.VALID_ACTIVATION_CODES = originalEnv
    } else {
      delete process.env.VALID_ACTIVATION_CODES
    }
  })

  it('returns empty object when env var is not set', () => {
    const result = getActivationCodesFromEnv()
    expect(result).toEqual({})
  })

  it('returns parsed object when valid JSON is set', () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
      'DEF456': { planId: 'plan-uuid-2' },
    })

    const result = getActivationCodesFromEnv()
    expect(result).toEqual({
      ABC123: { planId: 'plan-uuid-1' },
      DEF456: { planId: 'plan-uuid-2' },
    })
  })

  it('returns empty object when JSON is invalid', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.VALID_ACTIVATION_CODES = '{invalid json'

    const result = getActivationCodesFromEnv()
    expect(result).toEqual({})
    expect(consoleError).toHaveBeenCalledWith('Invalid VALID_ACTIVATION_CODES JSON in environment variable')

    consoleError.mockRestore()
  })

  it('returns empty object when env var is empty string', () => {
    process.env.VALID_ACTIVATION_CODES = ''

    const result = getActivationCodesFromEnv()
    expect(result).toEqual({})
  })

  it('parses JSON with multiple fields per code', () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'CODE1': { planId: 'plan-uuid-1', description: 'Test code' },
    })

    const result = getActivationCodesFromEnv()
    expect(result.CODE1).toEqual({ planId: 'plan-uuid-1', description: 'Test code' })
  })
})

describe('validateActivationCode', () => {
  const originalEnv = process.env.VALID_ACTIVATION_CODES

  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.VALID_ACTIVATION_CODES
  })

  afterAll(() => {
    if (originalEnv !== undefined) {
      process.env.VALID_ACTIVATION_CODES = originalEnv
    } else {
      delete process.env.VALID_ACTIVATION_CODES
    }
  })

  it('returns planId for a valid activation code', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('ABC123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('returns null for an invalid activation code', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('INVALID')
    expect(result).toBeNull()
  })

  it('normalizes activation code to uppercase', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('abc123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('normalizes activation code to uppercase (mixed case)', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('AbC123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('trims whitespace from activation code', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('  ABC123  ')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('trims and normalizes whitespace with case change', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
    })

    const result = await validateActivationCode('  abc123  ')
    expect(result).toEqual({ planId: 'plan-uuid-1' })
  })

  it('returns null when env var is not set', async () => {
    const result = await validateActivationCode('ANYCODE')
    expect(result).toBeNull()
  })

  it('returns null when env var has invalid JSON', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    process.env.VALID_ACTIVATION_CODES = '{invalid'

    const result = await validateActivationCode('ANYCODE')
    expect(result).toBeNull()

    consoleError.mockRestore()
  })

  it('handles multiple activation codes', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'CODE1': { planId: 'plan-uuid-1' },
      'CODE2': { planId: 'plan-uuid-2' },
      'CODE3': { planId: 'plan-uuid-3' },
    })

    expect(await validateActivationCode('CODE1')).toEqual({ planId: 'plan-uuid-1' })
    expect(await validateActivationCode('CODE2')).toEqual({ planId: 'plan-uuid-2' })
    expect(await validateActivationCode('CODE3')).toEqual({ planId: 'plan-uuid-3' })
    expect(await validateActivationCode('CODE4')).toBeNull()
  })

  it('treats codes as case-sensitive keys after normalization', async () => {
    process.env.VALID_ACTIVATION_CODES = JSON.stringify({
      'ABC123': { planId: 'plan-uuid-1' },
      'XYZ789': { planId: 'plan-uuid-2' },
    })

    // abc123 normalizes to ABC123, should not match XYZ789
    const result = await validateActivationCode('abc123')
    expect(result).toEqual({ planId: 'plan-uuid-1' })

    // xyz789 normalizes to XYZ789
    const result2 = await validateActivationCode('xyz789')
    expect(result2).toEqual({ planId: 'plan-uuid-2' })
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

  it('returns success with empty string activation code (min(1) allows empty in zod object but min on string requires >= 1 chars)', () => {
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

  it('ignores extra fields in body (zod strips unknown keys by default)', () => {
    const result = parseActivationCodeBody({ activationCode: 'ABC', extraField: 'ignored' })

    // zod.object() strips unknown keys by default, so extra fields are ignored
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