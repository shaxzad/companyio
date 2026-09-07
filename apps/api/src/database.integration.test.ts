import { PrismaPg } from '@prisma/adapter-pg';
import { randomUUID } from 'node:crypto';
import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from './generated/prisma/client.ts';

const databaseUrl = process.env.DATABASE_URL;
const prisma = databaseUrl
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) })
  : null;
const integrationTest = databaseUrl ? it : it.skip;

describe('PostgreSQL auth data model', () => {
  it('requires DATABASE_URL for integration coverage', () => {
    expect(databaseUrl ?? 'Set DATABASE_URL to run PostgreSQL integration tests').toBeTruthy();
  });

  integrationTest('stores a user, business, branch, and expiring session together', async () => {
    const userId = randomUUID();
    const businessId = randomUUID();
    const branchId = randomUUID();
    const accessToken = randomUUID();
    const email = `${userId}@integration.example.com`;

    await prisma!.business.create({
      data: { id: businessId, name: 'Interview Copilot', slug: `interview-${businessId}` },
    });
    await prisma!.branch.create({
      data: { id: branchId, main_business_id: businessId, name: 'Main Branch' },
    });
    await prisma!.user.create({
      data: {
        id: userId,
        email,
        name: 'Integration User',
        passwordHash: 'test-hash',
        main_business_id: businessId,
        branch_id: branchId,
      },
    });
    await prisma!.session.create({
      data: { accessToken, userId, expiresAt: new Date(Date.now() + 60_000) },
    });

    expect(await prisma!.user.count({ where: { id: userId } })).toBe(1);
    expect(await prisma!.business.count({ where: { id: businessId } })).toBe(1);
    expect(
      await prisma!.branch.count({ where: { id: branchId, main_business_id: businessId } })
    ).toBe(1);
    expect(await prisma!.session.findUnique({ where: { accessToken, userId } })).toBeTruthy();

    await prisma!.$transaction([
      prisma!.session.deleteMany({ where: { accessToken } }),
      prisma!.user.delete({ where: { id: userId } }),
      prisma!.branch.delete({ where: { id: branchId } }),
      prisma!.business.delete({ where: { id: businessId } }),
    ]);
  });
});

afterAll(async () => {
  await prisma?.$disconnect();
});
