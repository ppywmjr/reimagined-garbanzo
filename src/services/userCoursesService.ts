import { getPrismaClient } from '../lib/prisma.js'
import { activeSubscriptionFilter } from '../lib/subscriptionFilter.js'

const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  sortOrder: true,
} as const

export function buildCourseAccessWhere(clerkUserId: string, courseId: string) {
  return {
    ...activeSubscriptionFilter(clerkUserId),
    plan: {
      planCourses: {
        some: { courseId },
      },
    },
  }
}

export function buildUserCoursesWhere(clerkUserId: string) {
  return {
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
}

export async function userHasAccessToCourse(clerkUserId: string, courseId: string): Promise<boolean> {
  const subscription = await getPrismaClient().subscription.findFirst({
    where: buildCourseAccessWhere(clerkUserId, courseId),
  })
  return subscription !== null
}

export async function getUserCourses(clerkUserId: string, limit: number, offset: number) {
  const where = buildUserCoursesWhere(clerkUserId)
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
