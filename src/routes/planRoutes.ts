import { Router } from 'express'
import { z } from 'zod'
import * as planService from '../services/planService.js'
import { paginationSchema } from '../lib/validate.js'

const CreatePlanBody = z.object({
  name: z.string().min(1).max(200),
  stripeProductId: z.string().min(1),
  stripePriceId: z.string().min(1),
  billingInterval: z.enum(['month', 'year']),
  pricePence: z.number().int().nonnegative(),
  isActive: z.boolean().default(true),
  features: z.looseObject({}).default({}),
})

const router = Router()

router.post('/plans', async (req, res) => {
  const parse = CreatePlanBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }
  const result = await planService.createPlan(parse.data)
  res.status(201).json({ success: true, data: result })
})

router.get('/plans', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { plans, total } = await planService.getAllPlans(limit, offset)
  res.json({
    success: true,
    data: plans,
    pagination: { total, limit, offset, hasMore: offset + plans.length < total },
  })
})

router.get('/plans/:id', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan ID format' })
  }
  const plan = await planService.getPlanById(parse.data)
  if (!plan) return res.status(404).json({ success: false, error: 'Plan not found' })
  res.json({ success: true, data: plan })
})

export default router
