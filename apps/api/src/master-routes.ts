import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';
import { sendApiError } from './http-errors.ts';

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;

const id = z.string().min(1);
const DEFAULT_DENOMS = [5000, 1000, 500, 100, 50, 20, 10];

const requireUser = async (
  request: { headers: { authorization?: string } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  authenticate: Authenticator
) => {
  const user = await authenticate(request.headers.authorization);
  if (!user) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }
  return user;
};

const requireOwner = async (
  request: { headers: { authorization?: string } },
  reply: { code: (status: number) => { send: (body: unknown) => unknown } },
  authenticate: Authenticator
) => {
  const user = await requireUser(request, reply, authenticate);
  if (!user) return null;
  if (user.role !== 'owner') {
    reply.code(403).send({ message: 'Only the owner can change master data.' });
    return null;
  }
  return user;
};

export const registerMasterDataRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.patch('/api/v1/fuel/stations/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().min(1).max(120).optional(),
        address: z.string().max(240).optional(),
        city: z.string().max(80).optional(),
        logoUrl: z.string().max(500).optional(),
      })
      .parse(request.body);
    const station = await prisma.station.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    return reply.send(
      await prisma.station.update({
        where: { id: station.id },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.address !== undefined ? { address: input.address } : {}),
          ...(input.city !== undefined ? { city: input.city } : {}),
          ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
        },
      })
    );
  });

  app.patch('/api/v1/fuel/types/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().min(1).max(80).optional(),
        code: z.string().min(1).max(20).optional(),
        sellingPrice: z.number().positive().optional(),
        purchasePrice: z.number().positive().optional(),
        minimumStock: z.number().nonnegative().optional(),
        reorderLevel: z.number().nonnegative().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const fuelType = await prisma.fuelType.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!fuelType) return reply.code(404).send({ message: 'Product not found.' });
    return reply.send(
      await prisma.fuelType.update({
        where: { id: fuelType.id },
        data: input,
      })
    );
  });

  app.post('/api/v1/fuel/tanks', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        stationId: id,
        fuelTypeId: id,
        name: z.string().min(1).max(80),
        capacity: z.number().positive(),
        openingStock: z.number().nonnegative().default(0),
      })
      .parse(request.body);
    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    return reply.code(201).send(
      await prisma.tank.create({
        data: {
          id: randomUUID(),
          stationId: input.stationId,
          fuelTypeId: input.fuelTypeId,
          name: input.name,
          capacity: input.capacity,
          openingStock: input.openingStock,
          currentStock: input.openingStock,
        },
      })
    );
  });

  app.patch('/api/v1/fuel/tanks/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        name: z.string().min(1).max(80).optional(),
        capacity: z.number().positive().optional(),
        openingStock: z.number().nonnegative().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const tank = await prisma.tank.findFirst({
      where: { id: params.id, station: { businessId: user.main_business_id } },
    });
    if (!tank) return reply.code(404).send({ message: 'Tank not found.' });
    return reply.send(await prisma.tank.update({ where: { id: tank.id }, data: input }));
  });

  app.post('/api/v1/fuel/pumps', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        stationId: id,
        number: z.string().min(1).max(20),
        name: z.string().min(1).max(80),
      })
      .parse(request.body);
    const station = await prisma.station.findFirst({
      where: { id: input.stationId, businessId: user.main_business_id },
    });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    return reply.code(201).send(
      await prisma.pump.create({
        data: {
          id: randomUUID(),
          stationId: input.stationId,
          number: input.number,
          name: input.name,
        },
      })
    );
  });

  app.post('/api/v1/fuel/nozzles', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        pumpId: id,
        fuelTypeId: id,
        tankId: id.optional(),
        number: z.string().min(1).max(20),
        openingMeter: z.number().nonnegative().default(0),
      })
      .parse(request.body);
    const pump = await prisma.pump.findFirst({
      where: { id: input.pumpId, station: { businessId: user.main_business_id } },
    });
    if (!pump) return reply.code(404).send({ message: 'Meter / pump not found.' });
    return reply.code(201).send(
      await prisma.nozzle.create({
        data: {
          id: randomUUID(),
          pumpId: input.pumpId,
          fuelTypeId: input.fuelTypeId,
          tankId: input.tankId,
          number: input.number,
          openingMeter: input.openingMeter,
          currentMeter: input.openingMeter,
        },
      })
    );
  });

  app.patch('/api/v1/fuel/pumps/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        number: z.string().min(1).max(20).optional(),
        name: z.string().min(1).max(80).optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const pump = await prisma.pump.findFirst({
      where: { id: params.id, station: { businessId: user.main_business_id } },
    });
    if (!pump) return reply.code(404).send({ message: 'Meter / pump not found.' });
    return reply.send(await prisma.pump.update({ where: { id: pump.id }, data: input }));
  });

  app.patch('/api/v1/fuel/nozzles/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        number: z.string().min(1).max(20).optional(),
        fuelTypeId: id.optional(),
        tankId: id.nullable().optional(),
        openingMeter: z.number().nonnegative().optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const nozzle = await prisma.nozzle.findFirst({
      where: { id: params.id, pump: { station: { businessId: user.main_business_id } } },
    });
    if (!nozzle) return reply.code(404).send({ message: 'Nozzle not found.' });
    return reply.send(await prisma.nozzle.update({ where: { id: nozzle.id }, data: input }));
  });

  app.get('/api/v1/fuel/denominations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    return reply.send(
      await prisma.cashDenomination.findMany({
        where: { businessId: user.main_business_id },
        orderBy: { sortOrder: 'asc' },
      })
    );
  });

  app.post('/api/v1/fuel/denominations', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        value: z
          .number({
            required_error: 'Value is required.',
            invalid_type_error: 'Value must be a number.',
          })
          .int('Value must be a whole number.')
          .positive('Value must be greater than zero.'),
        label: z.string().max(40, 'Label must be at most 40 characters.').optional(),
        sortOrder: z.number().int().nonnegative().optional(),
      })
      .parse(request.body);
    try {
      return reply.code(201).send(
        await prisma.cashDenomination.create({
          data: {
            id: randomUUID(),
            businessId: user.main_business_id,
            value: input.value,
            label: input.label ?? `Rs ${input.value}`,
            sortOrder: input.sortOrder ?? input.value,
          },
        })
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return sendApiError(reply, 409, 'That denomination already exists.', {
          code: 'CONFLICT',
          fields: { value: 'That denomination already exists.' },
        });
      }
      throw error;
    }
  });

  app.post('/api/v1/fuel/denominations/defaults', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const created = await prisma.$transaction(
      DEFAULT_DENOMS.map((value, index) =>
        prisma.cashDenomination.upsert({
          where: { businessId_value: { businessId: user.main_business_id, value } },
          update: {},
          create: {
            id: randomUUID(),
            businessId: user.main_business_id,
            value,
            label: `Rs ${value}`,
            sortOrder: index,
          },
        })
      )
    );
    return reply.send(created);
  });

  app.patch('/api/v1/fuel/denominations/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const input = z
      .object({
        value: z.number().int().positive().optional(),
        label: z.string().max(40).optional(),
        active: z.boolean().optional(),
      })
      .parse(request.body);
    const row = await prisma.cashDenomination.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!row) return sendApiError(reply, 404, 'Denomination not found.', { code: 'NOT_FOUND' });
    try {
      return reply.send(
        await prisma.cashDenomination.update({ where: { id: row.id }, data: input })
      );
    } catch (error) {
      if ((error as { code?: string }).code === 'P2002') {
        return sendApiError(reply, 409, 'That denomination already exists.', {
          code: 'CONFLICT',
          fields: { value: 'That denomination already exists.' },
        });
      }
      throw error;
    }
  });

  app.delete('/api/v1/fuel/denominations/:id', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ id }).parse(request.params);
    const row = await prisma.cashDenomination.findFirst({
      where: { id: params.id, businessId: user.main_business_id },
    });
    if (!row) return sendApiError(reply, 404, 'Denomination not found.', { code: 'NOT_FOUND' });
    await prisma.cashDenomination.delete({ where: { id: row.id } });
    return reply.code(204).send();
  });

  app.get('/api/v1/fuel/rates', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ fuelTypeId: id.optional() }).parse(request.query);
    return reply.send(
      await prisma.sellingRate.findMany({
        where: {
          fuelType: { businessId: user.main_business_id },
          ...(query.fuelTypeId ? { fuelTypeId: query.fuelTypeId } : {}),
        },
        include: { fuelType: true },
        orderBy: { effectiveFrom: 'desc' },
      })
    );
  });

  app.post('/api/v1/fuel/rates', async (request, reply) => {
    const user = await requireOwner(request, reply, authenticate);
    if (!user) return;
    const input = z
      .object({
        fuelTypeId: id,
        sellingPrice: z.number().positive(),
        effectiveFrom: z.coerce.date().optional(),
      })
      .parse(request.body);
    const fuelType = await prisma.fuelType.findFirst({
      where: { id: input.fuelTypeId, businessId: user.main_business_id },
    });
    if (!fuelType) return reply.code(404).send({ message: 'Product not found.' });
    const effectiveFrom = input.effectiveFrom ?? new Date();
    const [rate] = await prisma.$transaction([
      prisma.sellingRate.create({
        data: {
          id: randomUUID(),
          fuelTypeId: fuelType.id,
          sellingPrice: input.sellingPrice,
          effectiveFrom,
        },
        include: { fuelType: true },
      }),
      prisma.fuelType.update({
        where: { id: fuelType.id },
        data: { sellingPrice: input.sellingPrice },
      }),
    ]);
    return reply.code(201).send(rate);
  });
};
