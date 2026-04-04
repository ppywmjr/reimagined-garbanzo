import { getPrismaClient } from '../lib/prisma.js'

export async function createUser(data: {
  clerkUserId: string
  email: string
  displayName?: string
}) {
  return getPrismaClient().user.create({
    data: {
      clerkUserId: data.clerkUserId,
      email: data.email,
      displayName: data.displayName,
    },
  })
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
