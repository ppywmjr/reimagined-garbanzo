import { getPrismaClient } from '../lib/prisma.js'
import * as activationCodeService from './activationCodeService.js'

export async function createUserSubscription(clerkUserId: string, activationCode: string) {
  const validated = await activationCodeService.validateActivationCode(activationCode)
  if (!validated) {
    return { success: false, error: 'Invalid activation code' } as const
  }

  const planExists = await getPrismaClient().plan.findUnique({
    where: { id: validated.planId },
  })

  if (!planExists) {
    return { success: false, error: 'Plan not found for this activation code' } as const
  }

  // Check if user already has an active subscription to the same plan
  const existingSubscription = await getPrismaClient().subscription.findFirst({
    where: {
      user: { clerkUserId },
      planId: validated.planId,
    },
  })

  if (existingSubscription) {
    return { success: false, error: 'You already have a subscription to this plan' } as const
  }

  const subscription = await getPrismaClient().subscription.create({
    data: {
      user: {
        connectOrCreate: {
          where: { clerkUserId },
          create: {
            email: 'activated@example.com',
            clerkUserId,
            displayName: 'Activated User',
          },
        },
      },
      planId: validated.planId,
      status: 'active',
    } as any,
  })

  return { success: true, data: subscription } as const
}
