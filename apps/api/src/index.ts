import Fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient, type User as DatabaseUser } from './generated/prisma/client.ts';
import { registerFuelRoutes } from './fuel-routes.ts';
import {
  SignInSchema,
  SignUpSchema,
  UpdateProfileSchema,
  type AuthSession,
  type User as AuthUser,
} from '@companyio/auth-contracts';

dotenv.config({ path: new URL('../../../.env', import.meta.url) });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required');

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: databaseUrl }) });
const scrypt = promisify(scryptCallback);

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

const hashPassword = async (password: string, salt = randomBytes(16).toString('hex')) => {
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString('hex')}`;
};

const verifyPassword = async (password: string, storedHash: string) => {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const expected = Buffer.from(key, 'hex');
  const actual = (await scrypt(password, salt, expected.length)) as Buffer;
  return expected.length === actual.length && timingSafeEqual(expected, actual);
};

const publicUser = (record: DatabaseUser): AuthUser => ({
  id: record.id,
  email: record.email,
  name: record.name,
  ...(record.firstName ? { firstName: record.firstName } : {}),
  ...(record.lastName ? { lastName: record.lastName } : {}),
  ...(record.phone ? { phone: record.phone } : {}),
  ...(record.bio ? { bio: record.bio } : {}),
  ...(record.facebookUrl ? { facebookUrl: record.facebookUrl } : {}),
  ...(record.xUrl ? { xUrl: record.xUrl } : {}),
  ...(record.linkedinUrl ? { linkedinUrl: record.linkedinUrl } : {}),
  ...(record.instagramUrl ? { instagramUrl: record.instagramUrl } : {}),
  main_business_id: record.main_business_id,
  branch_id: record.branch_id,
  ...(record.avatarUrl ? { avatarUrl: record.avatarUrl } : {}),
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

const createSession = async (user: AuthUser): Promise<AuthSession> => {
  const accessToken = randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 60 * 60 * 1000;
  await prisma.session.create({
    data: { accessToken, userId: user.id, expiresAt: new Date(expiresAt) },
  });
  return { accessToken, expiresAt, user };
};

const getAuthenticatedUser = async (authorization?: string) => {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!token) return null;
  const session = await prisma.session.findFirst({
    where: { accessToken: token, expiresAt: { gt: new Date() } },
    include: { user: true },
  });
  return session ? publicUser(session.user) : null;
};

app.get('/health', async () => ({ status: 'ok', timestamp: new Date() }));
app.get('/api/v1', async () => ({ message: 'Interview Copilot API v1', version: '0.1.0' }));

app.post('/api/v1/auth/sign-up', async (request, reply) => {
  const input = SignUpSchema.parse(request.body);
  const email = input.email.toLowerCase();
  const now = new Date();
  const mainBusinessId = randomUUID();
  const branchId = randomUUID();
  const userId = randomUUID();
  const slugBase = input.businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.business.create({
        data: {
          id: mainBusinessId,
          name: input.businessName,
          slug: `${slugBase}-${mainBusinessId.slice(0, 8)}`,
          createdAt: now,
        },
      });
      await transaction.branch.create({
        data: {
          id: branchId,
          main_business_id: mainBusinessId,
          name: 'Main Branch',
          createdAt: now,
        },
      });
      await transaction.user.create({
        data: {
          id: userId,
          email,
          name: input.name,
          main_business_id: mainBusinessId,
          branch_id: branchId,
          passwordHash: await hashPassword(input.password),
          createdAt: now,
          updatedAt: now,
        },
      });
      const stationId = randomUUID();
      const petrolId = randomUUID();
      const dieselId = randomUUID();
      await transaction.station.create({
        data: {
          id: stationId,
          businessId: mainBusinessId,
          name: 'Main Station',
          code: 'MAIN',
        },
      });
      await transaction.fuelType.createMany({
        data: [
          {
            id: petrolId,
            businessId: mainBusinessId,
            name: 'Petrol',
            code: 'PETROL',
            sellingPrice: 280,
            purchasePrice: 265,
            minimumStock: 2000,
            reorderLevel: 5000,
          },
          {
            id: dieselId,
            businessId: mainBusinessId,
            name: 'Diesel',
            code: 'DIESEL',
            sellingPrice: 285,
            purchasePrice: 270,
            minimumStock: 2000,
            reorderLevel: 5000,
          },
        ],
      });
      await transaction.tank.createMany({
        data: [
          {
            id: randomUUID(),
            stationId,
            fuelTypeId: petrolId,
            name: 'Petrol Tank 01',
            capacity: 20000,
            openingStock: 0,
            currentStock: 0,
          },
          {
            id: randomUUID(),
            stationId,
            fuelTypeId: dieselId,
            name: 'Diesel Tank 02',
            capacity: 20000,
            openingStock: 0,
            currentStock: 0,
          },
        ],
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002')
      return reply.code(409).send({ message: 'An account with this email already exists.' });
    throw error;
  }

  const user = publicUser(await prisma.user.findUniqueOrThrow({ where: { id: userId } }));
  return reply.code(201).send(await createSession(user));
});

app.post('/api/v1/auth/sign-in', async (request, reply) => {
  const input = SignInSchema.parse(request.body);
  const record = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (!record || !(await verifyPassword(input.password, record.passwordHash)))
    return reply.code(401).send({ message: 'Email or password is incorrect.' });
  return reply.send(await createSession(publicUser(record)));
});

app.get('/api/v1/auth/session', async (request, reply) => {
  const user = await getAuthenticatedUser(request.headers.authorization);
  if (!user) return reply.code(401).send({ message: 'Session expired.' });
  return reply.send(await createSession(user));
});

app.post('/api/v1/auth/logout', async (request, reply) => {
  const token = request.headers.authorization?.replace(/^Bearer /, '');
  if (token) await prisma.session.deleteMany({ where: { accessToken: token } });
  return reply.code(204).send();
});

app.get('/api/v1/users/me', async (request, reply) => {
  const user = await getAuthenticatedUser(request.headers.authorization);
  if (!user) return reply.code(401).send({ message: 'Authentication required.' });
  return reply.send(user);
});

app.patch('/api/v1/users/me', async (request, reply) => {
  const user = await getAuthenticatedUser(request.headers.authorization);
  if (!user) return reply.code(401).send({ message: 'Authentication required.' });
  const input = UpdateProfileSchema.parse(request.body);
  try {
    const updatedRecord = await prisma.user.update({
      where: { id: user.id },
      data: { ...input, name: `${input.firstName} ${input.lastName}` },
    });
    const updatedUser = publicUser(updatedRecord);
    return reply.send({ session: await createSession(updatedUser), user: updatedUser });
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002')
      return reply.code(409).send({ message: 'An account with this email already exists.' });
    throw error;
  }
});

app.get('/api/v1/organizations', async (request, reply) => {
  const user = await getAuthenticatedUser(request.headers.authorization);
  if (!user) return reply.code(401).send({ message: 'Authentication required.' });
  const [business, branch] = await Promise.all([
    prisma.business.findUnique({ where: { id: user.main_business_id } }),
    prisma.branch.findUnique({ where: { id: user.branch_id } }),
  ]);
  return reply.send(
    business && branch
      ? [
          {
            id: business.id,
            name: business.name,
            slug: business.slug,
            role: 'owner',
            main_business_id: business.id,
            branch_id: branch.id,
          },
        ]
      : []
  );
});

registerFuelRoutes(app, prisma, getAuthenticatedUser);

const start = async () => {
  try {
    await app.listen({
      port: Number.parseInt(process.env.API_PORT ?? '3000', 10),
      host: process.env.API_HOST ?? 'localhost',
    });
    console.log('Server running at http://localhost:3000');
  } catch (error) {
    app.log.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

void start();
