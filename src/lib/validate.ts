import { z } from 'zod'

/**
 * Shared pagination schema. Coerces query-string values to numbers and
 * applies safe bounds. Invalid values fall back to defaults silently.
 */
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).catch(20),
  offset: z.coerce.number().int().min(0).catch(0),
})
