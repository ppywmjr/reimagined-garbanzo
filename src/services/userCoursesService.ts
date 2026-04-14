import { getPrismaClient } from '../lib/prisma.js'
import { SubscriptionStatus } from '../../prisma/generated/enums.js'

const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  sortOrder: true,
} as const

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

export async function userHasAccessToCourse(clerkUserId: string, courseId: string): Promise<boolean> {
  const subscription = await getPrismaClient().subscription.findFirst({
    where: {
      ...activeSubscriptionFilter(clerkUserId),
      plan: {
        planCourses: {
          some: { courseId },
        },
      },
    },
  })
  return subscription !== null
}

export async function getUserCourses(clerkUserId: string, limit: number, offset: number) {
  const where = {
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
  }
  const [courses, total] = await Promise.all([
    getPrismaClient().course.findMany({
      where,
      select: courseSelect,
      take: limit,
      skip: offset,
      orderBy: { sortOrder: 'asc' },
    }),
    getPrismaClient().course.count({ where }),
  ])
  return { courses, total }
}
