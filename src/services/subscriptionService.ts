import { getPrismaClient } from '../lib/prisma.js'
import { SubscriptionStatus } from '../../prisma/generated/enums.js'

export async function createSubscription(data: {
  userId: string
  planId?: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt?: Date
}) {
  return getPrismaClient().subscription.create({ data })
}

export async function getAllSubscriptions(limit: number, offset: number) {
  const [subscriptions, total] = await Promise.all([
    getPrismaClient().subscription.findMany({ take: limit, skip: offset }),
    getPrismaClient().subscription.count(),
  ])
  return { subscriptions, total }
}

export async function getSubscriptionById(id: string) {
  return getPrismaClient().subscription.findUnique({ where: { id } })
}
