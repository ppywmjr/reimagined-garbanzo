import { vi } from 'vitest'

process.env.INTERNAL_API_SECRET = 'test-internal-api-key'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: vi.fn(() => ({ userId: 'user_test_clerk_123', isAuthenticated: true })),
  clerkClient: {
    users: {
      getUser: vi.fn().mockResolvedValue({
        emailAddresses: [{ id: 'primary_email_id', emailAddress: 'signup@test.com' }],
        primaryEmailAddressId: 'primary_email_id',
      }),
    },
  },
}))
