import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Prisma } from '../../prisma/generated/client.js';

vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: vi.fn(),
}));

import { getPrismaClient } from '../../src/lib/prisma.js';
import { createUser } from '../../src/services/userService.js';

const mockCreate = vi.fn();
const mockFindUniqueOrThrow = vi.fn();

beforeEach(() => {
  vi.mocked(getPrismaClient).mockReturnValue({
    user: { create: mockCreate, findUniqueOrThrow: mockFindUniqueOrThrow },
  } as any);
  vi.clearAllMocks();
  // Re-apply the mock return value after clearAllMocks resets call state
  vi.mocked(getPrismaClient).mockReturnValue({
    user: { create: mockCreate, findUniqueOrThrow: mockFindUniqueOrThrow },
  } as any);
});

const baseData = { clerkUserId: 'clerk_123', email: 'test@example.com' };
const storedUser = {
  id: 'uuid-1',
  clerkUserId: 'clerk_123',
  email: 'test@example.com',
  displayName: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('createUser', () => {
  it('creates the user and returns { user, created: true } on success', async () => {
    mockCreate.mockResolvedValue(storedUser);

    const result = await createUser(baseData);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { clerkUserId: 'clerk_123', email: 'test@example.com', displayName: undefined },
    });
    expect(result).toEqual({ user: storedUser, created: true });
  });

  it('includes displayName in the create call when provided', async () => {
    const withName = { ...baseData, displayName: 'Alice' };
    const userWithName = { ...storedUser, displayName: 'Alice' };
    mockCreate.mockResolvedValue(userWithName);

    const result = await createUser(withName);

    expect(mockCreate).toHaveBeenCalledWith({
      data: { clerkUserId: 'clerk_123', email: 'test@example.com', displayName: 'Alice' },
    });
    expect(result).toEqual({ user: userWithName, created: true });
  });

  it('returns the existing user with created: false on a P2002 unique constraint error', async () => {
    const constraintError = new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
      code: 'P2002',
      clientVersion: '5.0.0',
    });
    mockCreate.mockRejectedValue(constraintError);
    mockFindUniqueOrThrow.mockResolvedValue(storedUser);

    const result = await createUser(baseData);

    expect(mockFindUniqueOrThrow).toHaveBeenCalledWith({ where: { clerkUserId: 'clerk_123' } });
    expect(result).toEqual({ user: storedUser, created: false });
  });

  it('does not call findUniqueOrThrow when a non-P2002 Prisma error is thrown', async () => {
    const otherError = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '5.0.0',
    });
    mockCreate.mockRejectedValue(otherError);

    await expect(createUser(baseData)).rejects.toThrow();
    expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
  });

  it('re-throws generic non-Prisma errors without calling findUniqueOrThrow', async () => {
    const genericError = new Error('Connection lost');
    mockCreate.mockRejectedValue(genericError);

    await expect(createUser(baseData)).rejects.toThrow('Connection lost');
    expect(mockFindUniqueOrThrow).not.toHaveBeenCalled();
  });
});
