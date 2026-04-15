import { Router } from 'express'
import { z } from 'zod'
import { getAuth } from '@clerk/express'
import * as courseService from '../services/courseService.js'
import * as userCoursesService from '../services/userCoursesService.js'
import { paginationSchema } from '../lib/validate.js'

const router = Router()

router.use('/me', (req, res, next) => {
  const { userId, isAuthenticated } = getAuth(req)
  if (!isAuthenticated || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }
  next()
})

router.get('/me/courses', async (req, res) => {
  const { userId } = getAuth(req)
  const { limit, offset } = paginationSchema.parse(req.query)
  const { courses, total } = await userCoursesService.getUserCourses(userId!, limit, offset)
  res.json({
    success: true,
    data: courses,
    pagination: { total, limit, offset, hasMore: offset + courses.length < total },
  })
})

router.get('/me/courses/:id/videos', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const { userId } = getAuth(req)
  const hasAccess = await userCoursesService.userHasAccessToCourse(userId!, parse.data)
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  const { limit, offset } = paginationSchema.parse(req.query)
  const { videos, total } = await courseService.getCourseVideos(parse.data, userId!, limit, offset)
  res.json({
    success: true,
    data: videos,
    pagination: { total, limit, offset, hasMore: offset + videos.length < total },
  })
})

router.get('/me/courses/:id/videos/:videoId', async (req, res) => {
  console.log('GET /me/courses/:id/videos/:videoId called with params:', req.params)
  const parseCourseId = z.uuid().safeParse(req.params.id)
  if (!parseCourseId.success) {
    return res.status(400).json({ success: false, error: 'Invalid course ID format' })
  }
  const parseVideoId = z.uuid().safeParse(req.params.videoId)
  if (!parseVideoId.success) {
    return res.status(400).json({ success: false, error: 'Invalid video ID format' })
  }
  const { userId } = getAuth(req)
  console.log('Parsed courseId:', parseCourseId.data, 'Parsed videoId:', parseVideoId.data, 'UserId:', userId)
  const hasAccess = await userCoursesService.userHasAccessToCourse(userId!, parseCourseId.data)
  if (!hasAccess) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }
  const video = await courseService.getCourseVideoById(parseCourseId.data, parseVideoId.data, userId!)
  if (!video) {
    return res.status(404).json({ success: false, error: 'Video not found' })
  }
  res.json({ success: true, data: video })
})

export default router
