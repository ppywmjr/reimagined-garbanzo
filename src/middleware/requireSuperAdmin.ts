import type { Request, Response, NextFunction } from 'express'
import { getAuthWithBypass } from '../lib/auth-helper.js'
import { getPrismaClient } from '../lib/prisma.js'

export async function requireSuperAdmin(req: Request, res: Response, next: NextFunction) {
  const { userId, isAuthenticated } = getAuthWithBypass(req)

  if (!isAuthenticated || !userId) {
    return res.status(401).json({ success: false, error: 'Unauthorized' })
  }

  const user = await getPrismaClient().user.findUnique({
    where: { clerkUserId: userId },
    select: { superAdmin: true },
  })

  if (!user || !user.superAdmin) {
    return res.status(403).json({ success: false, error: 'Forbidden' })
  }

  next()
}
