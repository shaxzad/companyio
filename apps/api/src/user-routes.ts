import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import {
  CreateManagedUserSchema,
  UpdateManagedUserSchema,
  type User as AuthUser,
} from '@companyio/auth-contracts';
import type { PrismaClient, User as DatabaseUser } from './generated/prisma/client.ts';

type HashPassword = (password: string, salt?: string) => Promise<string>;
type PublicUser = (record: DatabaseUser) => AuthUser;
type GetAuthenticatedUser = (authorization?: string) => Promise<AuthUser | null>;

type AuthErrorBody = { message: string };
type OwnerAuth =
  { ok: true; user: AuthUser } | { ok: false; error: { status: 401 | 403; body: AuthErrorBody } };

const forbidden = (message: string): AuthErrorBody => ({ message });
const notFound: AuthErrorBody = { message: 'User not found.' };

export const registerUserRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  getAuthenticatedUser: GetAuthenticatedUser,
  publicUser: PublicUser,
  hashPassword: HashPassword
) => {
  const requireOwner = async (authorization?: string): Promise<OwnerAuth> => {
    const user = await getAuthenticatedUser(authorization);
    if (!user)
      return { ok: false, error: { status: 401, body: { message: 'Authentication required.' } } };
    if (user.role !== 'owner')
      return {
        ok: false,
        error: { status: 403, body: forbidden('Only the owner can manage users.') },
      };
    return { ok: true, user };
  };

  const businessUser = (owner: AuthUser, id: string) =>
    prisma.user.findFirst({
      where: { id, main_business_id: owner.main_business_id },
    });

  app.get('/api/v1/users', async (request, reply) => {
    const auth = await requireOwner(request.headers.authorization);
    if (auth.ok === false) return reply.code(auth.error.status).send(auth.error.body);
    const users = await prisma.user.findMany({
      where: { main_business_id: auth.user.main_business_id },
      orderBy: { createdAt: 'asc' },
    });
    return reply.send(users.map(publicUser));
  });

  app.post('/api/v1/users', async (request, reply) => {
    const auth = await requireOwner(request.headers.authorization);
    if (auth.ok === false) return reply.code(auth.error.status).send(auth.error.body);
    const input = CreateManagedUserSchema.parse(request.body);
    const email = input.email.toLowerCase();
    const now = new Date();

    try {
      const created = await prisma.user.create({
        data: {
          id: randomUUID(),
          email,
          name: input.name,
          role: input.role,
          isActive: true,
          main_business_id: auth.user.main_business_id,
          branch_id: auth.user.branch_id,
          passwordHash: await hashPassword(input.password),
          createdAt: now,
          updatedAt: now,
        },
      });
      return reply.code(201).send(publicUser(created));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        return reply.code(409).send({ message: 'An account with this email already exists.' });
      throw error;
    }
  });

  app.patch('/api/v1/users/:id', async (request, reply) => {
    const auth = await requireOwner(request.headers.authorization);
    if (auth.ok === false) return reply.code(auth.error.status).send(auth.error.body);
    const { id } = request.params as { id: string };
    const input = UpdateManagedUserSchema.parse(request.body);
    const record = await businessUser(auth.user, id);
    if (!record) return reply.code(404).send(notFound);

    if (record.role === 'owner' && (input.role || input.isActive === false))
      return reply
        .code(400)
        .send({ message: 'The owner account cannot be reassigned or deactivated.' });

    try {
      const updated = await prisma.user.update({
        where: { id: record.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.email ? { email: input.email.toLowerCase() } : {}),
          ...(input.role ? { role: input.role } : {}),
          ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
          ...(input.password ? { passwordHash: await hashPassword(input.password) } : {}),
        },
      });

      if (input.isActive === false)
        await prisma.session.deleteMany({ where: { userId: updated.id } });

      return reply.send(publicUser(updated));
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002')
        return reply.code(409).send({ message: 'An account with this email already exists.' });
      throw error;
    }
  });
};
