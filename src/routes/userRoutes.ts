import { Router } from 'express'
import { z } from 'zod'
import { getAuth, clerkClient } from '@clerk/express'
import * as userService from '../services/userService.js'
import { paginationSchema } from '../lib/validate.js'

const CreateUserBody = z.object({
  clerkUserId: z.string().min(1),
  email: z.email(),
  displayName: z.string().max(100).optional(),
})

const router = Router()

router.post('/signup', async (req, res) => {
  const { userId, isAuthenticated } = getAuth(req)
  if (!isAuthenticated || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const parse = CreateUserBody.safeParse(req.body)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: parse.error.issues[0].message })
  }

  if (parse.data.clerkUserId !== userId) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  const clerkUser = await clerkClient.users.getUser(userId)
  const primaryEmail = clerkUser.emailAddresses.find(
    (e: { id: string; emailAddress: string }) => e.id === clerkUser.primaryEmailAddressId,
  )?.emailAddress
  if (parse.data.email !== primaryEmail) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  const { user, created } = await userService.createUser(parse.data)
  res.status(created ? 201 : 200).json({ success: true, data: user })
})

router.get('/users', async (req, res) => {
  const { limit, offset } = paginationSchema.parse(req.query)
  const { users, total } = await userService.getAllUsers(limit, offset)
  res.json({
    success: true,
    data: users,
    pagination: { total, limit, offset, hasMore: offset + users.length < total },
  })
})

router.get('/users/:id', async (req, res) => {
  const parse = z.uuid().safeParse(req.params.id)
  if (!parse.success) {
    return res.status(400).json({ success: false, error: 'Invalid user ID format' })
  }
  const user = await userService.getUserById(parse.data)
  if (!user) return res.status(404).json({ success: false, error: 'User not found' })
  res.json({ success: true, data: user })
})

export default router
