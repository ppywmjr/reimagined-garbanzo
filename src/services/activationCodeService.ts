import { z } from 'zod'

const ActivationCodeBody = z.object({
  activationCode: z.string().min(1),
})

/**
 * Hardcoded valid activation codes.
 * Replace this with database lookups when ready.
 */
const VALID_ACTIVATION_CODES: Record<string, { planId: string }> = {
  'PLAN-A-2024': { planId: 'plan-a-id' },
  'PLAN-B-2024': { planId: 'plan-b-id' },
  'FREE-PLAN':   { planId: 'free-plan-id' },
}

export { ActivationCodeBody, VALID_ACTIVATION_CODES }

export interface ActivationCodeResult {
  planId: string
}

/**
 * Validates an activation code and returns the associated plan ID.
 * Returns null if the code is invalid or not found.
 */
export async function validateActivationCode(activationCode: string): Promise<ActivationCodeResult | null> {
  const normalized = activationCode.trim().toUpperCase()
  const entry = VALID_ACTIVATION_CODES[normalized]
  if (!entry) {
    return null
  }
  return entry
}

/**
 * Parses and validates the activation code request body.
 */
export function parseActivationCodeBody(body: unknown) {
  return ActivationCodeBody.safeParse(body)
}