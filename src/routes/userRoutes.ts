import { Router } from 'express'
import * as userService from '../services/userService.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const router = Router()

router.post('/signup', async (req, res) => {
  const { clerkUserId, email, displayName } = req.body
  const result = await userService.createUser({ clerkUserId, email, displayName })
  res.json({ success: true, data: result })
})

router.get('/users', async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 20, 100)
  const offset = Number(req.query.offset) || 0
  const { users, total } = await userService.getAllUsers(limit, offset)
  res.json({
    success: true,
    data: users,
    pagination: { total, limit, offset, hasMore: offset + users.length < total },
  })
})

router.get('/users/:id', async (req, res) => {
  if (!UUID_RE.test(req.params.id)) {
    return res.status(400).json({ success: false, error: 'Invalid user ID format' })
  }
  const user = await userService.getUserById(req.params.id)
  if (!user) return res.status(404).json({ success: false, error: 'User not found' })
  res.json({ success: true, data: user })
})

export default router
