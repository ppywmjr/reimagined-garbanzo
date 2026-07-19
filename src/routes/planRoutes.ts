import { Router } from 'express'
import { z } from 'zod'
import * as planService from '../services/planService.js'
import { paginationSchema } from '../lib/validate.js'

const CreatePlanBody = z.object({
  name: z.string().min(1).max(200),
  stripeProductId: z.string().min(1).optional(),
  stripePriceId: z.string().min(1).optional(),
  billingInterval: z.enum(['month', 'year']).optional(),
  pricePence: z.number().int().nonnegative().optional(),
  isActive: z.boolean().default(true),
  courseIds: z.array(z.string().uuid()).optional(),
})

const PatchPlanBody = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  pricePence: z.number().int().nonnegative().optional(),
  stripeProductId: z.string().min(1).optional(),
  stripePriceId: z.string().min(1).optional(),
})

const AddCourseBody = z.object({
  courseId: z.string().uuid(),
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

router.patch('/plans/:id', async (req, res) => {
  const parseId = z.uuid().safeParse(req.params.id)
  if (!parseId.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan ID format' })
  }
  const parseBody = PatchPlanBody.safeParse(req.body)
  if (!parseBody.success) {
    return res.status(400).json({ success: false, error: parseBody.error.issues[0].message })
  }
  const result = await planService.patchPlan(parseId.data, parseBody.data)
  res.json({ success: true, data: result })
})

router.post('/plans/:planId/courses/:courseId', async (req, res) => {
  const parsePlanId = z.uuid().safeParse(req.params.planId)
  if (!parsePlanId.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan ID format' })
  }
  const parseCourseId = z.uuid().safeParse(req.params.courseId)
  if (!parseCourseId.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const result = await planService.addCourseToPlan(parsePlanId.data, parseCourseId.data)
  res.status(201).json({ success: true, data: result })
})

router.delete('/plans/:planId/courses/:courseId', async (req, res) => {
  const parsePlanId = z.uuid().safeParse(req.params.planId)
  if (!parsePlanId.success) {
    return res.status(400).json({ success: false, error: 'Invalid plan ID format' })
  }
  const parseCourseId = z.uuid().safeParse(req.params.courseId)
  if (!parseCourseId.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const result = await planService.removeCourseFromPlan(parsePlanId.data, parseCourseId.data)
  res.json({ success: true, data: result })
})

export default router
