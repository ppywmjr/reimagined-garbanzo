import { Prisma } from '../../prisma/generated/client.js'
import { getPrismaClient } from '../lib/prisma.js'

export async function createUser(data: {
  clerkUserId: string
  email: string
  displayName?: string
}): Promise<{ user: Prisma.UserModel; created: boolean }> {
  const db = getPrismaClient()
  try {
    const user = await db.user.create({
      data: {
        clerkUserId: data.clerkUserId,
        email: data.email,
        displayName: data.displayName,
      },
    })
    return { user, created: true }
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      const user = await db.user.findUniqueOrThrow({ where: { clerkUserId: data.clerkUserId } })
      return { user, created: false }
    }
    throw err
  }
}

export async function getAllUsers(limit: number, offset: number) {
  const [users, total] = await Promise.all([
    getPrismaClient().user.findMany({ take: limit, skip: offset }),
    getPrismaClient().user.count(),
  ])
  return { users, total }
}

export async function getUserById(id: string) {
  return getPrismaClient().user.findUnique({ where: { id } })
}
