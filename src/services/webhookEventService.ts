import { getPrismaClient } from '../lib/prisma.js'
import { WebhookStatus } from '../../prisma/generated/enums.js'

export async function createWebhookEvent(data: {
  stripeEventId: string
  eventType: string
  payload: object
  status: WebhookStatus
  processedAt?: Date
}) {
  return getPrismaClient().webhookEvent.create({ data })
}

export async function getAllWebhookEvents(limit: number, offset: number) {
  const [webhookEvents, total] = await Promise.all([
    getPrismaClient().webhookEvent.findMany({ take: limit, skip: offset }),
    getPrismaClient().webhookEvent.count(),
  ])
  return { webhookEvents, total }
}

export async function getWebhookEventById(id: string) {
  return getPrismaClient().webhookEvent.findUnique({ where: { id } })
}
