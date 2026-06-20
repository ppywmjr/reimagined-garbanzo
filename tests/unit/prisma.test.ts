import { vi, describe, it, expect } from 'vitest'

vi.mock('../../prisma/generated/client.js', () => ({
    PrismaClient: vi.fn().mockImplementation(() => ({
        $disconnect: vi.fn().mockResolvedValue(undefined),
    })),
}))

vi.mock('@prisma/adapter-pg', () => ({
    PrismaPg: vi.fn(),
}))

import { disconnectPrisma } from '../../src/lib/prisma.js'

describe('disconnectPrisma', () => {
    it('resolves without error when no client has been initialised', async () => {
        // prismaInstance is null at module load time — this exercises the false branch
        await expect(disconnectPrisma()).resolves.toBeUndefined()
    })
})
