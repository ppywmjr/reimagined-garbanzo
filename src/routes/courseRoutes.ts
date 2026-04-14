import { Router } from 'express'
import { z } from 'zod'
import * as courseService from '../services/courseService.js'
import { paginationSchema } from '../lib/validate.js'
import { getAuth } from '@clerk/express'

const router = Router()

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
  const { userId } = getAuth(req)
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

export default router
