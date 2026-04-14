import { getPrismaClient } from '../lib/prisma.js'
import { SubscriptionStatus } from '../../prisma/generated/enums.js'

function activeSubscriptionFilter(clerkUserId: string) {
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

export async function userHasAccessToVideo(clerkUserId: string, videoId: string): Promise<boolean> {
  const courseVideo = await getPrismaClient().courseVideo.findFirst({
    where: {
      videoId,
      course: {
        isPublished: true,
        planCourses: {
          some: {
            plan: {
              subscriptions: {
                some: activeSubscriptionFilter(clerkUserId),
              },
            },
          },
        },
      },
    },
  })
  return courseVideo !== null
}
