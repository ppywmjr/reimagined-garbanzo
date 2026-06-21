import { getPrismaClient } from '../lib/prisma.js'
import { activeSubscriptionFilter } from '../lib/subscriptionFilter.js'

export function buildVideoAccessWhere(clerkUserId: string, videoId: string) {
  return {
    videoId,
    course: {
      isPublished: true,
      planCourses: {
        some: {
          plan: {
            subscriptions: {
              some: activeSubscriptionFilter(clerkUserId),
            },
          },
        },
      },
    },
  }
}

export async function userHasAccessToVideo(clerkUserId: string, videoId: string): Promise<boolean> {
  const courseVideo = await getPrismaClient().courseVideo.findFirst({
    where: buildVideoAccessWhere(clerkUserId, videoId),
  })
  return courseVideo !== null
}

export async function upsertVideoProgress(
  clerkUserId: string,
  courseId: string,
  videoId: string,
  data: { watched?: boolean; progressSecs?: number }
) {
  const db = getPrismaClient()

  const courseVideo = await db.courseVideo.findFirst({ where: { courseId, videoId } })
  if (!courseVideo) return null

  const user = await db.user.findUniqueOrThrow({ where: { clerkUserId } })
  return db.userVideoProgress.upsert({
    where: { userId_videoId: { userId: user.id, videoId } },
    update: data,
    create: { userId: user.id, videoId, watched: data.watched ?? false, progressSecs: data.progressSecs ?? 0 },
    select: { videoId: true, watched: true, progressSecs: true, updatedAt: true },
  })
}
