import { z } from 'zod'
import { getPrismaClient } from '../lib/prisma.js'

const ActivationCodeBody = z.object({
  activationCode: z.string().min(1),
})

export interface ActivationCodeResult {
  planId: string
}

/**
 * Validates an activation code against the database.
 * Returns null if the code is invalid, inactive, expired, or not found.
 */
export async function validateActivationCode(activationCode: string): Promise<ActivationCodeResult | null> {
  const normalized = activationCode.trim().toUpperCase()
  const record = await getPrismaClient().activationCode.findFirst({
    where: {
      code: normalized,
      isActive: true,
      OR: [
        { expiresAt: null },
        { expiresAt: { gte: new Date() } },
      ],
    },
  })
  if (!record) {
    return null
  }
  return { planId: record.planId }
}

/**
 * Parses and validates the activation code request body.
 */
export function parseActivationCodeBody(body: unknown) {
  return ActivationCodeBody.safeParse(body)
}