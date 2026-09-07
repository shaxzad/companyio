import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import type { PrismaClient } from './generated/prisma/client.ts';
import type { User as AuthUser } from '@companyio/auth-contracts';

const id = z.string().min(1);
const positive = z.number().positive();
const date = z.coerce.date();

const stationInput = z.object({
  name: z.string().min(1).max(120),
  code: z.string().min(1).max(30),
  address: z.string().max(240).optional(),
  city: z.string().max(80).optional(),
});

const fuelTypeInput = z.object({
  name: z.string().min(1).max(80),
  code: z.string().min(1).max(20),
  sellingPrice: positive,
  purchasePrice: positive,
  minimumStock: z.number().nonnegative(),
  reorderLevel: z.number().nonnegative(),
});

const organizationInput = z.object({
  name: z.string().min(1).max(160),
  contactName: z.string().max(120).optional(),
  phone: z.string().max(40).optional(),
  email: z.string().email().optional(),
  address: z.string().max(240).optional(),
  paymentTerms: z.string().max(80).optional(),
  creditLimit: z.number().nonnegative().default(0),
});

const vehicleInput = z.object({
  registration: z.string().min(1).max(30),
  type: z.string().max(80).optional(),
  makeModel: z.string().max(120).optional(),
  driver: z.string().max(120).optional(),
  notes: z.string().max(500).optional(),
});

const saleInput = z.object({
  stationId: id,
  fuelTypeId: id,
  tankId: id,
  nozzleId: id.optional(),
  organizationId: id.optional(),
  vehicleId: id.optional(),
  saleType: z.enum(['CASH', 'CARD', 'CREDIT']),
  litres: positive,
  unitPrice: positive.optional(),
  openingMeter: z.number().nonnegative().optional(),
  closingMeter: z.number().nonnegative().optional(),
  soldAt: date.optional(),
  notes: z.string().max(500).optional(),
});

const receiptInput = z.object({
  stationId: id,
  supplier: z.string().min(1).max(160),
  tankerNumber: z.string().max(80).optional(),
  invoiceNumber: z.string().max(80).optional(),
  fuelTypeId: id,
  tankId: id,
  litres: positive,
  purchasePrice: positive,
  receivedAt: date.optional(),
  notes: z.string().max(500).optional(),
});

const paymentInput = z.object({
  stationId: id,
  organizationId: id.optional(),
  amount: positive,
  method: z.enum(['CASH', 'BANK', 'CARD', 'TRANSFER']),
  reference: z.string().max(120).optional(),
  paidAt: date.optional(),
  notes: z.string().max(500).optional(),
});

const expenseInput = z.object({
  stationId: id,
  category: z.string().min(1).max(80),
  description: z.string().min(1).max(240),
  amount: positive,
  method: z.enum(['CASH', 'BANK', 'CARD', 'TRANSFER']),
  spentAt: date.optional(),
  reference: z.string().max(120).optional(),
});

const closingInput = z.object({
  stationId: id,
  businessDate: date,
  openingCash: z.number().nonnegative(),
  actualCash: z.number().nonnegative(),
  expectedCash: z.number().nonnegative(),
  notes: z.string().max(500).optional(),
});

type Authenticator = (authorization?: string) => Promise<AuthUser | null>;
type FuelUser = Omit<AuthUser, 'id' | 'main_business_id' | 'branch_id'> & {
  id: string;
  main_business_id: string;
  branch_id: string;
};

const requireUser = async (request: { headers: { authorization?: string } }, reply: { code: (status: number) => { send: (body: unknown) => unknown } }, authenticate: Authenticator): Promise<FuelUser | null> => {
  const user = await authenticate(request.headers.authorization);
  if (!user || !user.id || !user.main_business_id || !user.branch_id) {
    reply.code(401).send({ message: 'Authentication required.' });
    return null;
  }
  return user as FuelUser;
};

const numberValue = (value: unknown) => Number(value);

export const registerFuelRoutes = (
  app: FastifyInstance,
  prisma: PrismaClient,
  authenticate: Authenticator
) => {
  app.get('/api/v1/fuel/dashboard', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id.optional() }).parse(request.query);
    const station = query.stationId
      ? await prisma.station.findFirst({ where: { id: query.stationId, businessId: user.main_business_id } })
      : await prisma.station.findFirst({ where: { businessId: user.main_business_id, active: true } });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const [sales, receipts, payments, expenses, tanks, organizations] = await Promise.all([
      prisma.sale.aggregate({ where: { stationId: station.id, soldAt: { gte: start }, status: 'CONFIRMED' }, _sum: { totalAmount: true, totalLitres: true } }),
      prisma.fuelReceipt.aggregate({ where: { stationId: station.id, receivedAt: { gte: start }, status: 'CONFIRMED' }, _sum: { totalCost: true } }),
      prisma.payment.aggregate({ where: { stationId: station.id, paidAt: { gte: start } }, _sum: { amount: true } }),
      prisma.expense.aggregate({ where: { stationId: station.id, spentAt: { gte: start } }, _sum: { amount: true } }),
      prisma.tank.findMany({ where: { stationId: station.id, active: true }, include: { fuelType: true } }),
      prisma.organization.findMany({ where: { businessId: user.main_business_id, active: true }, include: { sales: { where: { saleType: 'CREDIT', status: 'CONFIRMED' }, select: { totalAmount: true } }, payments: { select: { amount: true } } } }),
    ]);

    const creditOutstanding = organizations.reduce((total, organization) => {
      const salesTotal = organization.sales.reduce((sum, sale) => sum + numberValue(sale.totalAmount), 0);
      const paymentsTotal = organization.payments.reduce((sum, payment) => sum + numberValue(payment.amount), 0);
      return total + salesTotal - paymentsTotal;
    }, 0);

    return reply.send({
      station,
      today: {
        sales: numberValue(sales._sum.totalAmount),
        litres: numberValue(sales._sum.totalLitres),
        receivedCost: numberValue(receipts._sum.totalCost),
        payments: numberValue(payments._sum.amount),
        expenses: numberValue(expenses._sum.amount),
        creditOutstanding,
      },
      tanks: tanks.map((tank) => ({ ...tank, currentStock: numberValue(tank.currentStock), capacity: numberValue(tank.capacity) })),
    });
  });

  app.get('/api/v1/fuel/stations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    return reply.send(await prisma.station.findMany({ where: { businessId: user.main_business_id }, orderBy: { name: 'asc' } }));
  });

  app.post('/api/v1/fuel/stations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = stationInput.parse(request.body);
    const station = await prisma.station.create({ data: { id: randomUUID(), businessId: user.main_business_id, name: input.name, code: input.code, address: input.address, city: input.city } });
    return reply.code(201).send(station);
  });

  app.get('/api/v1/fuel/types', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    return reply.send(await prisma.fuelType.findMany({ where: { businessId: user.main_business_id, active: true }, orderBy: { name: 'asc' } }));
  });

  app.post('/api/v1/fuel/types', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = fuelTypeInput.parse(request.body);
    return reply.code(201).send(await prisma.fuelType.create({ data: { id: randomUUID(), businessId: user.main_business_id, name: input.name, code: input.code, sellingPrice: input.sellingPrice, purchasePrice: input.purchasePrice, minimumStock: input.minimumStock, reorderLevel: input.reorderLevel } }));
  });

  app.get('/api/v1/fuel/organizations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    return reply.send(await prisma.organization.findMany({ where: { businessId: user.main_business_id, active: true }, include: { vehicles: true }, orderBy: { name: 'asc' } }));
  });

  app.post('/api/v1/fuel/organizations', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = organizationInput.parse(request.body);
    return reply.code(201).send(await prisma.organization.create({ data: { id: randomUUID(), businessId: user.main_business_id, name: input.name, contactName: input.contactName, phone: input.phone, email: input.email, address: input.address, paymentTerms: input.paymentTerms, creditLimit: input.creditLimit } }));
  });

  app.post('/api/v1/fuel/organizations/:organizationId/vehicles', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ organizationId: id }).parse(request.params);
    const organization = await prisma.organization.findFirst({ where: { id: params.organizationId, businessId: user.main_business_id } });
    if (!organization) return reply.code(404).send({ message: 'Organization not found.' });
    const input = vehicleInput.parse(request.body);
    return reply.code(201).send(await prisma.vehicle.create({ data: { id: randomUUID(), organizationId: organization.id, registration: input.registration, type: input.type, makeModel: input.makeModel, driver: input.driver, notes: input.notes } }));
  });

  app.post('/api/v1/fuel/sales', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = saleInput.parse(request.body);
    if (input.closingMeter !== undefined && input.openingMeter !== undefined && input.closingMeter < input.openingMeter)
      return reply.code(400).send({ message: 'Closing meter cannot be lower than opening meter.' });
    if (input.saleType === 'CREDIT' && (!input.organizationId || !input.vehicleId))
      return reply.code(400).send({ message: 'Credit sales require an organization and vehicle.' });

    const [station, fuelType, tank, organization, vehicle] = await Promise.all([
      prisma.station.findFirst({ where: { id: input.stationId, businessId: user.main_business_id, active: true } }),
      prisma.fuelType.findFirst({ where: { id: input.fuelTypeId, businessId: user.main_business_id, active: true } }),
      prisma.tank.findUnique({ where: { id: input.tankId } }),
      input.organizationId ? prisma.organization.findFirst({ where: { id: input.organizationId, businessId: user.main_business_id, active: true } }) : null,
      input.vehicleId ? prisma.vehicle.findUnique({ where: { id: input.vehicleId } }) : null,
    ]);
    if (!station || !fuelType || !tank || tank.stationId !== station.id || tank.fuelTypeId !== fuelType.id)
      return reply.code(400).send({ message: 'Station, tank, and fuel type do not match.' });
    if (input.saleType === 'CREDIT' && (!organization || !vehicle || vehicle.organizationId !== organization.id))
      return reply.code(400).send({ message: 'Vehicle does not belong to the selected organization.' });
    if (numberValue(tank.currentStock) < input.litres)
      return reply.code(400).send({ message: 'Insufficient tank stock.' });

    const unitPrice = input.unitPrice ?? numberValue(fuelType.sellingPrice);
    const amount = input.litres * unitPrice;
    const saleNumber = `SALE-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
    const sale = await prisma.$transaction(async (transaction) => {
      const updatedTank = await transaction.tank.update({ where: { id: tank.id }, data: { currentStock: { decrement: input.litres } } });
      const created = await transaction.sale.create({
        data: {
          id: randomUUID(), saleNumber, stationId: station.id, ...(organization ? { organizationId: organization.id } : {}), ...(vehicle ? { vehicleId: vehicle.id } : {}),
          saleType: input.saleType, soldAt: input.soldAt ?? new Date(), totalAmount: amount, totalLitres: input.litres, notes: input.notes, createdBy: user.id,
          lines: { create: { id: randomUUID(), fuelTypeId: fuelType.id, nozzleId: input.nozzleId, litres: input.litres, unitPrice, amount, openingMeter: input.openingMeter, closingMeter: input.closingMeter } },
        },
        include: { lines: true },
      });
      await transaction.inventoryMovement.create({ data: { id: randomUUID(), stationId: station.id, tankId: tank.id, fuelTypeId: fuelType.id, sourceType: 'SALE', sourceId: created.id, quantity: -input.litres, balanceAfter: updatedTank.currentStock } });
      await transaction.auditLog.create({ data: { id: randomUUID(), businessId: user.main_business_id, userId: user.id, action: 'CREATE', entityType: 'SALE', entityId: created.id, details: { saleNumber, amount, litres: input.litres } } });
      return created;
    });
    return reply.code(201).send(sale);
  });

  app.post('/api/v1/fuel/receipts', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = receiptInput.parse(request.body);
    const [station, fuelType, tank] = await Promise.all([
      prisma.station.findFirst({ where: { id: input.stationId, businessId: user.main_business_id, active: true } }),
      prisma.fuelType.findFirst({ where: { id: input.fuelTypeId, businessId: user.main_business_id, active: true } }),
      prisma.tank.findUnique({ where: { id: input.tankId } }),
    ]);
    if (!station || !fuelType || !tank || tank.stationId !== station.id || tank.fuelTypeId !== fuelType.id)
      return reply.code(400).send({ message: 'Station, tank, and fuel type do not match.' });
    const totalCost = input.litres * input.purchasePrice;
    const receipt = await prisma.$transaction(async (transaction) => {
      const updatedTank = await transaction.tank.update({ where: { id: tank.id }, data: { currentStock: { increment: input.litres } } });
      const created = await transaction.fuelReceipt.create({ data: { id: randomUUID(), stationId: station.id, supplier: input.supplier, tankerNumber: input.tankerNumber, invoiceNumber: input.invoiceNumber, receivedAt: input.receivedAt ?? new Date(), totalCost, notes: input.notes, createdBy: user.id, lines: { create: { id: randomUUID(), fuelTypeId: fuelType.id, tankId: tank.id, litres: input.litres, purchasePrice: input.purchasePrice, amount: totalCost } } }, include: { lines: true } });
      await transaction.inventoryMovement.create({ data: { id: randomUUID(), stationId: station.id, tankId: tank.id, fuelTypeId: fuelType.id, sourceType: 'RECEIPT', sourceId: created.id, quantity: input.litres, balanceAfter: updatedTank.currentStock } });
      await transaction.auditLog.create({ data: { id: randomUUID(), businessId: user.main_business_id, userId: user.id, action: 'CREATE', entityType: 'FUEL_RECEIPT', entityId: created.id } });
      return created;
    });
    return reply.code(201).send(receipt);
  });

  app.post('/api/v1/fuel/payments', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = paymentInput.parse(request.body);
    if (input.organizationId && !(await prisma.organization.findFirst({ where: { id: input.organizationId, businessId: user.main_business_id } }))) return reply.code(404).send({ message: 'Organization not found.' });
    return reply.code(201).send(await prisma.payment.create({ data: { id: randomUUID(), stationId: input.stationId, organizationId: input.organizationId, amount: input.amount, method: input.method, reference: input.reference, paidAt: input.paidAt ?? new Date(), notes: input.notes, createdBy: user.id } }));
  });

  app.post('/api/v1/fuel/expenses', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = expenseInput.parse(request.body);
    if (!(await prisma.station.findFirst({ where: { id: input.stationId, businessId: user.main_business_id } }))) return reply.code(404).send({ message: 'Station not found.' });
    return reply.code(201).send(await prisma.expense.create({ data: { id: randomUUID(), stationId: input.stationId, category: input.category, description: input.description, amount: input.amount, method: input.method, spentAt: input.spentAt ?? new Date(), reference: input.reference, createdBy: user.id } }));
  });

  app.get('/api/v1/fuel/inventory/:stationId', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ stationId: id }).parse(request.params);
    const station = await prisma.station.findFirst({ where: { id: params.stationId, businessId: user.main_business_id } });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    return reply.send(await prisma.tank.findMany({ where: { stationId: station.id, active: true }, include: { fuelType: true, movements: { orderBy: { createdAt: 'desc' }, take: 20 } } }));
  });

  app.get('/api/v1/fuel/stations/:stationId/assets', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ stationId: id }).parse(request.params);
    const station = await prisma.station.findFirst({ where: { id: params.stationId, businessId: user.main_business_id } });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    return reply.send({
      tanks: await prisma.tank.findMany({ where: { stationId: station.id }, include: { fuelType: true }, orderBy: { name: 'asc' } }),
      pumps: await prisma.pump.findMany({ where: { stationId: station.id }, include: { nozzles: { include: { fuelType: true } } }, orderBy: { number: 'asc' } }),
    });
  });

  app.get('/api/v1/fuel/reports/sales', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const query = z.object({ stationId: id.optional(), from: date.optional(), to: date.optional() }).parse(request.query);
    const from = query.from ?? new Date(new Date().setHours(0, 0, 0, 0));
    const to = query.to ?? new Date();
    const sales = await prisma.sale.findMany({ where: { station: { businessId: user.main_business_id }, ...(query.stationId ? { stationId: query.stationId } : {}), soldAt: { gte: from, lte: to }, status: 'CONFIRMED' }, include: { lines: { include: { fuelType: true } }, organization: true, vehicle: true, station: true }, orderBy: { soldAt: 'desc' } });
    return reply.send({
      from,
      to,
      totals: {
        amount: sales.reduce((total, sale) => total + numberValue(sale.totalAmount), 0),
        litres: sales.reduce((total, sale) => total + numberValue(sale.totalLitres), 0),
        transactions: sales.length,
      },
      sales,
    });
  });

  app.get('/api/v1/fuel/organizations/:organizationId/ledger', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const params = z.object({ organizationId: id }).parse(request.params);
    const organization = await prisma.organization.findFirst({ where: { id: params.organizationId, businessId: user.main_business_id }, include: { sales: { where: { saleType: 'CREDIT', status: 'CONFIRMED' }, include: { vehicle: true, lines: { include: { fuelType: true } } }, orderBy: { soldAt: 'asc' } }, payments: { orderBy: { paidAt: 'asc' } } } });
    if (!organization) return reply.code(404).send({ message: 'Organization not found.' });
    const entries = [
      ...organization.sales.map((sale) => ({ date: sale.soldAt, type: 'FUEL', debit: numberValue(sale.totalAmount), credit: 0, reference: sale.saleNumber, description: sale.vehicle?.registration ?? 'Credit fuel sale' })),
      ...organization.payments.map((payment) => ({ date: payment.paidAt, type: 'PAYMENT', debit: 0, credit: numberValue(payment.amount), reference: payment.reference ?? payment.id, description: `${payment.method} payment` })),
    ].sort((left, right) => left.date.getTime() - right.date.getTime());
    let balance = 0;
    const ledger = entries.map((entry) => ({ ...entry, balance: (balance += entry.debit - entry.credit) }));
    return reply.send({ organization, ledger, outstanding: balance });
  });

  app.post('/api/v1/fuel/daily-closings', async (request, reply) => {
    const user = await requireUser(request, reply, authenticate);
    if (!user) return;
    const input = closingInput.parse(request.body);
    const station = await prisma.station.findFirst({ where: { id: input.stationId, businessId: user.main_business_id } });
    if (!station) return reply.code(404).send({ message: 'Station not found.' });
    const closing = await prisma.dailyClosing.create({ data: { id: randomUUID(), stationId: station.id, businessDate: input.businessDate, openingCash: input.openingCash, actualCash: input.actualCash, expectedCash: input.expectedCash, cashDifference: input.actualCash - input.expectedCash, notes: input.notes, closedBy: user.id } });
    await prisma.auditLog.create({ data: { id: randomUUID(), businessId: user.main_business_id, userId: user.id, action: 'CLOSE', entityType: 'DAILY_CLOSING', entityId: closing.id } });
    return reply.code(201).send(closing);
  });
};
