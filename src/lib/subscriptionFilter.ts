import { SubscriptionStatus } from '../../prisma/generated/enums.js'

/**
 * Builds a Prisma `where` filter that matches subscriptions which are
 * currently active or trialling and within their billing period.
 *
 * Shared between userCoursesService and userVideoService.
 */
export function activeSubscriptionFilter(clerkUserId: string) {
    const now = new Date()
    return {
        user: { clerkUserId },
        status: { in: [SubscriptionStatus.active, SubscriptionStatus.trialing] },
        AND: [
            { OR: [{ currentPeriodStart: null }, { currentPeriodStart: { lte: now } }] },
            { OR: [{ currentPeriodEnd: null }, { currentPeriodEnd: { gte: now } }] },
        ],
    }
}
