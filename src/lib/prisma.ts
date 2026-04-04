import { PrismaClient } from '../../prisma/generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

let prismaInstance: PrismaClient | null = null

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
    prismaInstance = new PrismaClient({ adapter: pool })
  }
  return prismaInstance
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
    prismaInstance = null
  }
}
