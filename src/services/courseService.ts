import { getPrismaClient } from '../lib/prisma.js'

const courseSelect = {
  id: true,
  title: true,
  description: true,
  thumbnail: true,
  sortOrder: true,
} as const

export async function getAllCourses(limit: number, offset: number) {
  const [courses, total] = await Promise.all([
    getPrismaClient().course.findMany({
      where: { isPublished: true },
      select: courseSelect,
      take: limit,
      skip: offset,
      orderBy: { sortOrder: 'asc' },
    }),
    getPrismaClient().course.count({ where: { isPublished: true } }),
  ])
  return { courses, total }
}

export async function getCourseById(id: string) {
  return getPrismaClient().course.findFirst({
    where: { id, isPublished: true },
    select: courseSelect,
  })
}

export async function getCourseVideos(courseId: string, clerkUserId: string | null, limit: number, offset: number) {
  const [courseVideos, total] = await Promise.all([
    getPrismaClient().courseVideo.findMany({
      where: { courseId },
      orderBy: { position: 'asc' },
      take: limit,
      skip: offset,
      include: {
        video: {
          include: {
            userProgress: clerkUserId
              ? { where: { user: { clerkUserId } }, take: 1 }
              : { take: 0 },
          },
        },
      },
    }),
    getPrismaClient().courseVideo.count({ where: { courseId } }),
  ])

  return {
    videos: courseVideos.map(({ video }) => {
      const { userProgress, ...videoFields } = video
      return {
        id: videoFields.id,
        title: videoFields.title,
        url: videoFields.url,
        thumbnail: videoFields.thumbnail,
        watched: userProgress[0]?.watched ?? false,
        progressSecs: userProgress[0]?.progressSecs ?? 0,
      }
    }),
    total,
  }
}

export async function getCourseVideoById(courseId: string, videoId: string, clerkUserId: string | null) {
  const courseVideo = await getPrismaClient().courseVideo.findFirst({
    where: { courseId, videoId },
    include: {
      video: {
        include: {
          userProgress: clerkUserId
            ? { where: { user: { clerkUserId } }, take: 1 }
            : { take: 0 },
        },
      },
    },
  })

  if (!courseVideo) return null

  const { video } = courseVideo
  const { userProgress, ...videoFields } = video
  return {
    id: videoFields.id,
    title: videoFields.title,
    url: videoFields.url,
    thumbnail: videoFields.thumbnail,
    watched: userProgress[0]?.watched ?? false,
    progressSecs: userProgress[0]?.progressSecs ?? 0,
  }
}
