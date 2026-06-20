import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Prisma } from '../../prisma/generated/client.js';

vi.mock('../../src/lib/prisma.js', () => ({
  getPrismaClient: vi.fn(),
}));

import { getPrismaClient } from '../../src/lib/prisma.js';
import { createUser, getAllUsers, getUserById } from '../../src/services/userService.js';

const mockCreate = vi.fn();
const mockFindUniqueOrThrow = vi.fn();
const mockFindMany = vi.fn();
const mockCount = vi.fn();
const mockFindUnique = vi.fn();

beforeEach(() => {
  vi.mocked(getPrismaClient).mockReturnValue({
    user: {
      create: mockCreate,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
    },
  } as any);
  vi.clearAllMocks();
  // Re-apply the mock return value after clearAllMocks resets call state
  vi.mocked(getPrismaClient).mockReturnValue({
    user: {
      create: mockCreate,
      findUniqueOrThrow: mockFindUniqueOrThrow,
      findMany: mockFindMany,
      count: mockCount,
      findUnique: mockFindUnique,
    },
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

describe('userService', () => {
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

  describe('getAllUsers', () => {
    it('returns users and total count', async () => {
      const users = [{ id: '1', clerkUserId: 'u1', email: 'e1' }, { id: '2', clerkUserId: 'u2', email: 'e2' }];
      mockFindMany.mockResolvedValue(users);
      mockCount.mockResolvedValue(2);

      const result = await getAllUsers(10, 0);

      expect(mockFindMany).toHaveBeenCalledWith({ take: 10, skip: 0 });
      expect(mockCount).toHaveBeenCalled();
      expect(result).toEqual({ users, total: 2 });
    });
  });

  describe('getUserById', () => {
    it('returns a user by id', async () => {
      const user = { id: 'uuid-1', clerkUserId: 'clerk_123', email: 'test@example.com' };
      mockFindUnique.mockResolvedValue(user);

      const result = await getUserById('uuid-1');

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 'uuid-1' } });
      expect(result).toEqual(user);
    });

    it('returns null if user is not found', async () => {
      mockFindUnique.mockResolvedValue(null);

      const result = await getUserById('non-existent');

      expect(result).toBeNull();
    });
  });
});
