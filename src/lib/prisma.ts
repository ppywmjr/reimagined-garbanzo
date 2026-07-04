import { PrismaClient } from '../../prisma/generated/client.js'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaPg } from '@prisma/adapter-pg'

let prismaInstance: PrismaClient | null = null

function isNeonUrl(url: string | undefined): boolean {
  return url?.includes('.neon.tech') ?? false
}

export function getPrismaClient(): PrismaClient {
  if (!prismaInstance) {
    const connectionString = process.env.DATABASE_URL!
    if (isNeonUrl(connectionString)) {
      const adapter = new PrismaNeon({ connectionString })
      prismaInstance = new PrismaClient({ adapter })
    } else {
      const adapter = new PrismaPg({ connectionString })
      prismaInstance = new PrismaClient({ adapter })
    }
  }
  return prismaInstance
}

export async function disconnectPrisma(): Promise<void> {
  if (prismaInstance) {
    await prismaInstance.$disconnect()
    prismaInstance = null
  }
}
