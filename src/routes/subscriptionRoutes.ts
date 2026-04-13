import { Router } from 'express'
import { z } from 'zod'
import * as subscriptionService from '../services/subscriptionService.js'
import { paginationSchema } from '../lib/validate.js'

const CreateSubscriptionBody = z.object({
  userId: z.uuid(),
  planId: z.uuid().optional(),
  stripeCustomerId: z.string().min(1),
  stripeSubscriptionId: z.string().min(1),
  status: z.enum(['active', 'trialing', 'past_due', 'cancelled', 'incomplete', 'incomplete_expired', 'unpaid']),
  currentPeriodStart: z.iso.datetime(),
  currentPeriodEnd: z.iso.datetime(),
  cancelledAt: z.iso.datetime().optional(),
})

const router = Router()

router.post('/subscriptions', async (req, res) => {
  const parse = CreateSubscriptionBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }
  const { currentPeriodStart, currentPeriodEnd, cancelledAt, ...rest } = parse.data
  const result = await subscriptionService.createSubscription({
    ...rest,
    currentPeriodStart: new Date(currentPeriodStart),
    currentPeriodEnd: new Date(currentPeriodEnd),
    cancelledAt: cancelledAt ? new Date(cancelledAt) : undefined,
  })
  res.status(201).json({ success: true, data: result })
})

router.get('/subscriptions', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { subscriptions, total } = await subscriptionService.getAllSubscriptions(limit, offset)
  res.json({
    success: true,
    data: subscriptions,
    pagination: { total, limit, offset, hasMore: offset + subscriptions.length < total },
  })
})

router.get('/subscriptions/flutters/videos', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { videos, total } = await subscriptionService.getFluttersVideos(limit, offset)

  res.json({
    success: true,
    data: videos,
    pagination: { total, limit, offset, hasMore: offset + videos.length < total },
  })
})

router.get('/subscriptions/:id', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid subscription ID format' })
  }
  const subscription = await subscriptionService.getSubscriptionById(parse.data)
  if (!subscription) return res.status(404).json({ success: false, error: 'Subscription not found' })
  res.json({ success: true, data: subscription })
})

export default router
