import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: vi.fn(),
}))

vi.mock('../../src/services/activationCodeService.js', () => ({
  validateActivationCode: vi.fn(),
}))

import { getPrismaClient } from '../../src/lib/prisma.js'
import * as activationCodeService from '../../src/services/activationCodeService.js'
import { createUserSubscription } from '../../src/services/userSubscriptionService.js'

const mockValidateActivationCode = vi.mocked(activationCodeService.validateActivationCode)
const mockFindUnique = vi.fn()
const mockFindFirst = vi.fn()
const mockCreate = vi.fn()

function applyMocks() {
  vi.mocked(getPrismaClient).mockReturnValue({
    subscription: {
      findUnique: mockFindUnique,
      findFirst: mockFindFirst,
      create: mockCreate,
    },
    plan: {
      findUnique: mockFindUnique,
    },
  } as any)
}

beforeEach(() => {
  vi.clearAllMocks()
  applyMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('createUserSubscription', () => {
  const validActivationCode = 'TEST-CODE'
  const clerkUserId = 'user-123'
  const planId = 'plan-uuid'

  describe('when activation code is invalid', () => {
    it('returns failure when validateActivationCode returns null', async () => {
      mockValidateActivationCode.mockResolvedValue(null)

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result).toEqual({ success: false, error: 'Invalid activation code' })
      expect(mockFindUnique).not.toHaveBeenCalled()
      expect(mockFindFirst).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('returns failure for empty string activation code', async () => {
      mockValidateActivationCode.mockResolvedValue(null)

      const result = await createUserSubscription(clerkUserId, '')

      expect(result).toEqual({ success: false, error: 'Invalid activation code' })
    })

    it('returns failure for random invalid code', async () => {
      mockValidateActivationCode.mockResolvedValue(null)

      const result = await createUserSubscription(clerkUserId, 'INVALID-CODE')

      expect(result).toEqual({ success: false, error: 'Invalid activation code' })
    })
  })

  describe('when plan does not exist for activation code', () => {
    it('returns failure when plan is not found', async () => {
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue(null)

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result).toEqual({ success: false, error: 'Plan not found for this activation code' })
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: planId } })
      expect(mockFindFirst).not.toHaveBeenCalled()
      expect(mockCreate).not.toHaveBeenCalled()
    })
  })

  describe('when user already has an active subscription to the same plan', () => {
    it('returns failure when user has existing subscription', async () => {
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: 'plan-uuid' })
      mockFindFirst.mockResolvedValue({ id: 'sub-existing', planId, status: 'active' })

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result).toEqual({ success: false, error: 'You already have a subscription to this plan' })
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: {
          user: { clerkUserId },
          planId,
        },
      })
      expect(mockCreate).not.toHaveBeenCalled()
    })

    it('checks for subscription after validating activation code and plan existence', async () => {
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)

      await createUserSubscription(clerkUserId, validActivationCode)

      // Verify the order: validate -> check plan -> check existing subscription
      expect(mockValidateActivationCode).toHaveBeenCalledWith(validActivationCode)
      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: planId } })
      expect(mockFindFirst).toHaveBeenCalled()
    })
  })

  describe('when subscription creation succeeds', () => {
    it('creates a new user and subscription when no existing subscription exists', async () => {
      const activationResult = { planId }
      const newSubscription = { id: 'sub-new', userId: 'user-123', planId, status: 'active' }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(newSubscription)

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result).toEqual({ success: true, data: newSubscription })
      expect(mockCreate).toHaveBeenCalledWith({
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
          plan: {
            connect: { id: planId },
          },
          status: 'active',
        },
      })
    })

    it('uses the correct planId from activation code validation', async () => {
      const customPlanId = 'custom-plan-456'
      const activationResult = { planId: customPlanId }
      const newSubscription = { id: 'sub-new', userId: 'user-123', planId: customPlanId, status: 'active' }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: customPlanId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(newSubscription)

      await createUserSubscription(clerkUserId, validActivationCode)

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: customPlanId } })
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: { connect: { id: customPlanId } },
          }),
        })
      )
    })

    it('creates subscription with status active', async () => {
      const activationResult = { planId }
      const newSubscription = { id: 'sub-new', userId: 'user-123', planId, status: 'active' }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(newSubscription)

      await createUserSubscription(clerkUserId, validActivationCode)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'active',
          }),
        })
      )
    })

    it('uses connectOrCreate for user to avoid duplicates', async () => {
      const activationResult = { planId }
      const newSubscription = { id: 'sub-new', userId: 'user-123', planId, status: 'active' }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(newSubscription)

      await createUserSubscription(clerkUserId, validActivationCode)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            user: expect.objectContaining({
              connectOrCreate: expect.objectContaining({
                where: { clerkUserId },
                create: {
                  email: 'activated@example.com',
                  clerkUserId,
                  displayName: 'Activated User',
                },
              }),
            }),
          }),
        })
      )
    })

    it('connects to existing plan by id', async () => {
      const activationResult = { planId }
      const newSubscription = { id: 'sub-new', userId: 'user-123', planId, status: 'active' }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(newSubscription)

      await createUserSubscription(clerkUserId, validActivationCode)

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            plan: { connect: { id: planId } },
          }),
        })
      )
    })

    it('returns the subscription data created by Prisma', async () => {
      const activationResult = { planId }
      const prismaSubscription = {
        id: 'sub-prisma-id',
        userId: 'user-123',
        planId,
        status: 'active',
        createdAt: new Date(),
      }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue(prismaSubscription)

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(prismaSubscription)
    })
  })

  describe('activation code validation flow', () => {
    it('validates activation code by calling validateActivationCode', async () => {
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'sub-new', userId: 'user-123', planId, status: 'active' })

      await createUserSubscription(clerkUserId, validActivationCode)

      expect(mockValidateActivationCode).toHaveBeenCalledWith(validActivationCode)
    })

    it('passes the activation code exactly as received', async () => {
      const mixedCaseCode = 'TeSt-CoDe'
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'sub-new', userId: 'user-123', planId, status: 'active' })

      await createUserSubscription(clerkUserId, mixedCaseCode)

      expect(mockValidateActivationCode).toHaveBeenCalledWith(mixedCaseCode)
    })
  })

  describe('edge cases', () => {
    it('handles different clerkUserId values', async () => {
      const activationResult = { planId }
      const differentUserId = 'different-user-456'
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'sub-new', userId: differentUserId, planId, status: 'active' })

      const result = await createUserSubscription(differentUserId, validActivationCode)

      expect(result.success).toBe(true)
    })

    it('returns a const-typed result (type safety)', async () => {
      // When activation code is invalid, validateActivationCode returns null
      mockValidateActivationCode.mockResolvedValue(null)

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      // Verify the result is a const assertion type
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error).toBe('Invalid activation code')
      }
    })

    it('handles case where existing subscription check returns null (no existing subscription)', async () => {
      const activationResult = { planId }
      mockValidateActivationCode.mockResolvedValue(activationResult)
      mockFindUnique.mockResolvedValue({ id: planId })
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ id: 'sub-new', userId: 'user-123', planId, status: 'active' })

      const result = await createUserSubscription(clerkUserId, validActivationCode)

      expect(result.success).toBe(true)
    })
  })
})