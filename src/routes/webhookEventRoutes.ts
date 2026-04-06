import { Router } from 'express'
import { z } from 'zod'
import * as webhookEventService from '../services/webhookEventService.js'
import { paginationSchema } from '../lib/validate.js'

const CreateWebhookEventBody = z.object({
  stripeEventId: z.string().min(1),
  eventType: z.string().min(1),
  payload: z.looseObject({}),
  status: z.enum(['pending', 'processed', 'failed']),
  processedAt: z.iso.datetime().optional(),
})

const router = Router()

router.post('/webhook-events', async (req, res) => {
  const parse = CreateWebhookEventBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }
  const { processedAt, ...rest } = parse.data
  const result = await webhookEventService.createWebhookEvent({
    ...rest,
    processedAt: processedAt ? new Date(processedAt) : undefined,
  })
  res.status(201).json({ success: true, data: result })
})

router.get('/webhook-events', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { webhookEvents, total } = await webhookEventService.getAllWebhookEvents(limit, offset)
  res.json({
    success: true,
    data: webhookEvents,
    pagination: { total, limit, offset, hasMore: offset + webhookEvents.length < total },
  })
})

router.get('/webhook-events/:id', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid webhook event ID format' })
  }
  const event = await webhookEventService.getWebhookEventById(parse.data)
  if (!event) return res.status(404).json({ success: false, error: 'Webhook event not found' })
  res.json({ success: true, data: event })
})

export default router
