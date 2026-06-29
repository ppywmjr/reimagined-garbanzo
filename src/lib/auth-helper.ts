import { getAuth } from '@clerk/express'
import { Request } from 'express'

/**
 * A helper to get authentication info, with an optional bypass for development.
 */
export function getAuthWithBypass(req: Request) {
    const auth = getAuth(req)

    // Check if we are in a non-production environment AND the bypass flag is set
    if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_AUTH === 'true') {
        return {
            userId: process.env.BYPASS_USER_ID || 'dev-user-id',
            isAuthenticated: true,
        }
    }

    return {
        userId: auth.userId ?? null,
        isAuthenticated: auth.isAuthenticated,
    }
}
