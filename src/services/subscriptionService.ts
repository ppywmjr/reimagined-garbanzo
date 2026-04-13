import { getPrismaClient } from '../lib/prisma.js'
import { SubscriptionStatus } from '../../prisma/generated/enums.js'

export async function createSubscription(data: {
  userId: string
  planId?: string
  stripeCustomerId: string
  stripeSubscriptionId: string
  status: SubscriptionStatus
  currentPeriodStart: Date
  currentPeriodEnd: Date
  cancelledAt?: Date
}) {
  return getPrismaClient().subscription.create({ data })
}

export async function getAllSubscriptions(limit: number, offset: number) {
  const [subscriptions, total] = await Promise.all([
    getPrismaClient().subscription.findMany({ take: limit, skip: offset }),
    getPrismaClient().subscription.count(),
  ])
  return { subscriptions, total }
}

export async function getSubscriptionById(id: string) {
  return getPrismaClient().subscription.findUnique({ where: { id } })
}

export type FluttersVideo = {
  id: string
  title: string
  url: string
  thumbnail: string
  channelName: string
  watched: boolean
  progress: number
}

export type GetFluttersVideosResult = {
  videos: FluttersVideo[]
  total: number
}

const STUB_FLUTTERS_VIDEOS: FluttersVideo[] = [
  {
    id: 'bjgqwBQ8-7g',
    title: 'Propulsion 2025 2-8 — Catherine Taylor',
    url: 'https://www.youtube.com/watch?v=bjgqwBQ8-7g',
    thumbnail: 'https://i.ytimg.com/vi/bjgqwBQ8-7g/hqdefault.jpg',
    channelName: 'Propulsion UK',
    watched: false,
    progress: 312,
  },
  {
    id: 'DN22xptfnes',
    title: 'Propulsion 2025 1-1 — A Singular Magic (Catherine Taylor)',
    url: 'https://www.youtube.com/watch?v=DN22xptfnes&list=RDDN22xptfnes&start_radio=1',
    thumbnail: 'https://i.ytimg.com/vi/DN22xptfnes/hqdefault.jpg',
    channelName: 'Propulsion UK',
    watched: true,
    progress: 0,
  },
  {
    id: 'BMkwmQmUa_g',
    title: 'Amy Sigil as The Gwragged Annwn',
    url: 'https://www.youtube.com/watch?v=BMkwmQmUa_g&list=RDBMkwmQmUa_g&start_radio=1',
    thumbnail: 'https://i.ytimg.com/vi/BMkwmQmUa_g/hqdefault.jpg',
    channelName: 'Amy Sigil',
    watched: false,
    progress: 0,
  },
]

export async function getFluttersVideos(limit: number, offset: number): Promise<GetFluttersVideosResult> {
  const videos = STUB_FLUTTERS_VIDEOS.slice(offset, offset + limit)
  return {
    videos,
    total: STUB_FLUTTERS_VIDEOS.length,
  }
}
