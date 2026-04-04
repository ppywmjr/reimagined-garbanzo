import { PrismaClient, Prisma } from './generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

const userData: Prisma.UserCreateInput[] = [
  {
    clerkUserId: 'clerk_user_alice',
    email: 'alice@prisma.io',
    displayName: 'Alice',
  },
  {
    clerkUserId: 'clerk_user_nilu',
    email: 'nilu@prisma.io',
    displayName: 'Nilu',
  },
  {
    clerkUserId: 'clerk_user_mahmoud',
    email: 'mahmoud@prisma.io',
    displayName: 'Mahmoud',
  },
]

async function main() {
  console.log(`Start seeding ...`)

  await prisma.user.deleteMany()

  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
    })
    console.log(`Created user with id: ${user.id}`)
  }
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
