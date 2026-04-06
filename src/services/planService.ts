import { getPrismaClient } from '../lib/prisma.js'
import { BillingInterval } from '../../prisma/generated/enums.js'

export async function createPlan(data: {
  name: string
  stripeProductId: string
  stripePriceId: string
  billingInterval: BillingInterval
  pricePence: number
  isActive: boolean
  features: object
}) {
  return getPrismaClient().plan.create({ data })
}

export async function getAllPlans(limit: number, offset: number) {
  const [plans, total] = await Promise.all([
    getPrismaClient().plan.findMany({ take: limit, skip: offset }),
    getPrismaClient().plan.count(),
  ])
  return { plans, total }
}

export async function getPlanById(id: string) {
  return getPrismaClient().plan.findUnique({ where: { id } })
}
