import { z } from 'zod'

const ActivationCodeBody = z.object({
  activationCode: z.string().min(1),
})

/**
 * Parse valid activation codes from environment variable.
 * Expected format: JSON object {"CODE": { "planId": "<uuid>" }, ...}
 * Falls back to empty object if not set (for safety in tests/local dev).
 */
function getActivationCodesFromEnv(): Record<string, { planId: string }> {
  const raw = process.env.VALID_ACTIVATION_CODES
  if (!raw) {
    return {}
  }
  try {
    return JSON.parse(raw) as Record<string, { planId: string }>
  } catch {
    console.error('Invalid VALID_ACTIVATION_CODES JSON in environment variable')
    return {}
  }
}

export { ActivationCodeBody, getActivationCodesFromEnv }

export interface ActivationCodeResult {
  planId: string
}

/**
 * Validates an activation code and returns the associated plan ID.
 * Returns null if the code is invalid or not found.
 */
export async function validateActivationCode(activationCode: string): Promise<ActivationCodeResult | null> {
  const normalized = activationCode.trim().toUpperCase()
  const codes = getActivationCodesFromEnv()
  const entry = codes[normalized]
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