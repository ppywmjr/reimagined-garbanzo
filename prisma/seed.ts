import { PrismaClient, Prisma } from './generated/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

const VIDEO_IDS = {
  taylor:   'b3f4a2e1-0c5d-4f6e-8a7b-9c0d1e2f3a4b',
  singular: 'c4e5b3f2-1d6e-5a7f-9b8c-0d1e2f3a4b5c',
  sigil:    'd5f6c4a3-2e7f-6b8a-0c9d-1e2f3a4b5c6d',
}

async function main() {
  console.log('Start seeding ...')

  // Delete in FK-safe order (dependents first)
  await prisma.userVideoProgress.deleteMany()
  await prisma.courseVideo.deleteMany()
  await prisma.planCourse.deleteMany()
  await prisma.subscription.deleteMany()
  await prisma.video.deleteMany()
  await prisma.course.deleteMany()
  await prisma.plan.deleteMany()
  await prisma.user.deleteMany()

  // Users
  const alice = await prisma.user.create({
    data: { clerkUserId: 'clerk_user_alice', email: 'alice@prisma.io', displayName: 'Alice' },
  })
  console.log(`Created user with id: ${alice.id}`)

  const ppywmjr = await prisma.user.create({
    data: { clerkUserId: 'user_3CIoLIb5xgmpOP4yUiJST7CBPd8', email: 'ppywmjr@gmail.com' },
  })
  console.log(`Created user with id: ${ppywmjr.id}`)

  // Videos
  await prisma.video.createMany({
    data: [
      { id: VIDEO_IDS.taylor,   title: 'Propulsion 2025 2-8 — Catherine Taylor', url: 'https://www.youtube.com/watch?v=bjgqwBQ8-7g', thumbnail: 'https://i.ytimg.com/vi/bjgqwBQ8-7g/hqdefault.jpg'},
      { id: VIDEO_IDS.singular, title: 'Propulsion 2025 1-1 — A Singular Magic (Catherine Taylor)', url: 'https://www.youtube.com/watch?v=DN22xptfnes&list=RDDN22xptfnes&start_radio=1', thumbnail: 'https://i.ytimg.com/vi/DN22xptfnes/hqdefault.jpg' },
      { id: VIDEO_IDS.sigil,    title: 'Amy Sigil as The Gwragged Annwn', url: 'https://www.youtube.com/watch?v=BMkwmQmUa_g&list=RDBMkwmQmUa_g&start_radio=1', thumbnail: 'https://i.ytimg.com/vi/BMkwmQmUa_g/hqdefault.jpg' },
    ],
  })
  console.log('Created 3 videos')

  // Plan
  const plan = await prisma.plan.create({
    data: { name: 'flutters-demo-plan', isFree: true, isActive: true },
  })
  console.log(`Created plan with id: ${plan.id}`)

  // Course
  const course = await prisma.course.create({
    data: { title: 'flutters-demo-course', isPublished: true },
  })
  console.log(`Created course with id: ${course.id}`)

  // Link plan → course
  await prisma.planCourse.create({
    data: { planId: plan.id, courseId: course.id },
  })

  // Link course → videos in order
  await prisma.courseVideo.createMany({
    data: [
      { courseId: course.id, videoId: VIDEO_IDS.taylor,   position: 1 },
      { courseId: course.id, videoId: VIDEO_IDS.singular, position: 2 },
      { courseId: course.id, videoId: VIDEO_IDS.sigil,    position: 3 },
    ],
  })
  console.log('Linked 3 videos to course')

  // Subscription for ppywmjr
  await prisma.subscription.create({
    data: { userId: ppywmjr.id, planId: plan.id },
  })
  console.log(`Created subscription for ${ppywmjr.email}`)

  // Video progress for ppywmjr
  await prisma.userVideoProgress.createMany({
    data: [
      { userId: ppywmjr.id, videoId: VIDEO_IDS.taylor,   watched: true,  progressSecs: 0  },
      { userId: ppywmjr.id, videoId: VIDEO_IDS.singular, watched: false, progressSecs: 60 },
      // sigil intentionally has no entry — defaults to watched=false, progressSecs=0
    ],
  })
  console.log(`Created video progress entries for ${ppywmjr.email}`)

  console.log('Seeding finished.')
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
