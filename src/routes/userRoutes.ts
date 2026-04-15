import { Router } from 'express'
import { z } from 'zod'
import { getAuth, clerkClient } from '@clerk/express'
import * as userService from '../services/userService.js'

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

export default router
