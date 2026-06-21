import { describe, it, expect } from 'vitest'
import { paginationSchema } from '../../src/lib/validate.js'

describe('paginationSchema', () => {
    it('parses valid limit and offset', () => {
        const result = paginationSchema.parse({ limit: '10', offset: '20' })
        expect(result).toEqual({ limit: 10, offset: 20 })
    })

    it('coerces string values to numbers', () => {
        const result = paginationSchema.parse({ limit: '5', offset: '0' })
        expect(result).toEqual({ limit: 5, offset: 0 })
    })

    it('falls back to default limit of 20 when limit is missing', () => {
        const result = paginationSchema.parse({ offset: '0' })
        expect(result.limit).toBe(20)
    })

    it('falls back to default offset of 0 when offset is missing', () => {
        const result = paginationSchema.parse({ limit: '10' })
        expect(result.offset).toBe(0)
    })

    it('falls back to defaults for an empty object', () => {
        const result = paginationSchema.parse({})
        expect(result).toEqual({ limit: 20, offset: 0 })
    })

    it('falls back to default limit when limit exceeds max of 100', () => {
        const result = paginationSchema.parse({ limit: '999' })
        expect(result.limit).toBe(20)
    })

    it('falls back to default limit when limit is below min of 1', () => {
        const result = paginationSchema.parse({ limit: '0' })
        expect(result.limit).toBe(20)
    })

    it('falls back to default offset when offset is negative', () => {
        const result = paginationSchema.parse({ offset: '-1' })
        expect(result.offset).toBe(0)
    })

    it('falls back to defaults when values are non-numeric strings', () => {
        const result = paginationSchema.parse({ limit: 'abc', offset: 'xyz' })
        expect(result).toEqual({ limit: 20, offset: 0 })
    })

    it('accepts the boundary values of 1 and 100 for limit', () => {
        expect(paginationSchema.parse({ limit: '1' }).limit).toBe(1)
        expect(paginationSchema.parse({ limit: '100' }).limit).toBe(100)
    })
})
