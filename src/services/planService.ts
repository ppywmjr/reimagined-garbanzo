import { getPrismaClient } from '../lib/prisma.js'
import { BillingInterval } from '../../prisma/generated/enums.js'

export async function createPlan(data: {
  name: string
  stripeProductId?: string
  stripePriceId?: string
  billingInterval?: BillingInterval
  pricePence?: number
  isActive: boolean
  courseIds?: string[]
  thumbnail?: string
}) {
  return getPrismaClient().plan.create({
    data: {
      name: data.name,
      stripeProductId: data.stripeProductId ?? null,
      stripePriceId: data.stripePriceId ?? null,
      billingInterval: data.billingInterval ?? null,
      pricePence: data.pricePence ?? null,
      isActive: data.isActive,
      thumbnail: data.thumbnail ?? null,
      planCourses: {
        createMany: {
          data: (data.courseIds ?? []).map((courseId) => ({ courseId })),
        },
      },
    },
  })
}

export async function getAllPlans(limit: number, offset: number) {
  const [plans, total] = await Promise.all([
    getPrismaClient().plan.findMany({
      take: limit,
      skip: offset,
      include: {
        planCourses: {
          include: {
            course: true,
          },
        },
      },
    }),
    getPrismaClient().plan.count(),
  ])
  return { plans, total }
}

export async function getPlanById(id: string) {
  return getPrismaClient().plan.findUnique({ where: { id } })
}

export async function patchPlan(id: string, data: {
  name?: string
  description?: string
  isActive?: boolean
  pricePence?: number
  stripeProductId?: string
  stripePriceId?: string
  thumbnail?: string
}) {
  return getPrismaClient().plan.update({
    where: { id },
    data,
  })
}

export async function addCourseToPlan(planId: string, courseId: string) {
  return getPrismaClient().planCourse.upsert({
    where: { planId_courseId: { planId, courseId } },
    create: { planId, courseId },
    update: {},
  })
}

export async function removeCourseFromPlan(planId: string, courseId: string) {
  return getPrismaClient().planCourse.delete({
    where: { planId_courseId: { planId, courseId } },
  })
}

export async function replacePlanCourses(planId: string, courseIds: string[]) {
  await getPrismaClient().planCourse.deleteMany({
    where: { planId },
  })
  if (courseIds.length > 0) {
    return getPrismaClient().planCourse.createMany({
      data: courseIds.map((courseId) => ({ planId, courseId })),
    })
  }
}
