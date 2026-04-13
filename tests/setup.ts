import { vi } from 'vitest'

vi.mock('@clerk/express', () => ({
  clerkMiddleware: () => (_req: unknown, _res: unknown, next: () => void) => next(),
  getAuth: () => ({ userId: 'user_test_clerk_123', isAuthenticated: true }),
}))
