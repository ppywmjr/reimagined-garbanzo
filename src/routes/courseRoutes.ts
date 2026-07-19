import { Router } from 'express'
import { z } from 'zod'
import * as courseService from '../services/courseService.js'
import { paginationSchema } from '../lib/validate.js'
import { getAuthWithBypass } from '../lib/auth-helper.js'

const CreateCourseBody = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  thumbnail: z.string().url().optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPublished: z.boolean().default(false),
})

const PatchCourseBody = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  thumbnail: z.string().url().optional(),
  sortOrder: z.number().int().min(0).optional(),
  isPublished: z.boolean().optional(),
})

const router = Router()

router.post('/courses', async (req, res) => {
  const parse = CreateCourseBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }
  const result = await courseService.createCourse(parse.data)
  res.status(201).json({ success: true, data: result })
})

router.get('/courses', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { courses, total } = await courseService.getAllCourses(limit, offset)
  res.json({
    success: true,
    data: courses,
    pagination: { total, limit, offset, hasMore: offset + courses.length < total },
  })
})

router.get('/courses/:id/videos', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const { userId } = getAuthWithBypass(req)
  const { limit, offset } = paginationSchema.parse(req.query)
  const { videos, total } = await courseService.getCourseVideos(parse.data, userId ?? null, limit, offset)
  res.json({
    success: true,
    data: videos,
    pagination: { total, limit, offset, hasMore: offset + videos.length < total },
  })
})

router.get('/courses/:id', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const course = await courseService.getCourseById(parse.data)
  if (!course) return res.status(404).json({ success: false, error: 'Course not found' })
  res.json({ success: true, data: course })
})

router.patch('/courses/:id', async (req, res) => {
  const parseId = z.uuid().safeParse(req.params.id)
  if (!parseId.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const parseBody = PatchCourseBody.safeParse(req.body)
  if (!parseBody.success) {
    return res.status(400).json({ success: false, error: parseBody.error.issues[0].message })
  }
  const result = await courseService.patchCourse(parseId.data, parseBody.data)
  res.json({ success: true, data: result })
})

export default router
