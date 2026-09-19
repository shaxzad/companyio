import type { PrismaClient } from './generated/prisma/client.ts';

type Tx = Omit<
  PrismaClient,
  '$connect' | '$disconnect' | '$on' | '$transaction' | '$extends' | '$use'
>;

const num = (value: unknown) => Number(value);

export const round3 = (value: number) => Math.round((value + Number.EPSILON) * 1000) / 1000;

/** Asia/Karachi day bounds (UTC+5, no DST). */
export const karachiDayBounds = (ymd: string) => ({
  start: new Date(`${ymd}T00:00:00.000+05:00`),
  end: new Date(`${ymd}T23:59:59.999+05:00`),
});

export const toYmdKarachi = (date: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Karachi' }).format(date);

/**
 * Paper-form stock columns for one tank on a business day, then write Closing Stock
 * so Feature 3 can carry it forward as tomorrow’s opening.
 */
export async function computeTankStockRecon(
  db: Tx | PrismaClient,
  args: {
    businessDayId: string;
    stationId: string;
    tankId: string;
    openingStock: number;
    returnLitres: number;
    businessDateYmd: string;
  }
) {
  const { start, end } = karachiDayBounds(args.businessDateYmd);

  const [receiptAgg, daySales] = await Promise.all([
    db.receiptLine.aggregate({
      where: {
        tankId: args.tankId,
        receipt: {
          stationId: args.stationId,
          OR: [
            { businessDayId: args.businessDayId },
            { businessDayId: null, receivedAt: { gte: start, lte: end } },
          ],
        },
      },
      _sum: { litres: true },
    }),
    db.sale.findMany({
      where: {
        stationId: args.stationId,
        status: 'CONFIRMED',
        OR: [{ businessDayId: args.businessDayId }, { soldAt: { gte: start, lte: end } }],
      },
      select: { id: true },
    }),
  ]);

  const saleIds = daySales.map((sale) => sale.id);
  const saleAgg =
    saleIds.length === 0
      ? { _sum: { quantity: null as unknown } }
      : await db.inventoryMovement.aggregate({
          where: {
            tankId: args.tankId,
            stationId: args.stationId,
            sourceType: 'SALE',
            sourceId: { in: saleIds },
            quantity: { lt: 0 },
          },
          _sum: { quantity: true },
        });

  const openingStock = round3(args.openingStock);
  const received = round3(num(receiptAgg._sum.litres ?? 0));
  const returnLitres = round3(args.returnLitres);
  const saleOfDay = round3(Math.abs(num(saleAgg._sum.quantity ?? 0)));
  const total = round3(openingStock + received - returnLitres);
  const closingStock = round3(total - saleOfDay);

  return {
    openingStock,
    received,
    returnLitres,
    total,
    saleOfDay,
    closingStock,
  };
}

export async function syncBusinessDayTankClosing(
  db: Tx | PrismaClient,
  businessDayId: string,
  tankId: string
) {
  const dayTank = await db.businessDayTank.findUnique({
    where: { businessDayId_tankId: { businessDayId, tankId } },
    include: {
      businessDay: { select: { id: true, stationId: true, businessDate: true } },
    },
  });
  if (!dayTank) return null;

  const computed = await computeTankStockRecon(db, {
    businessDayId,
    stationId: dayTank.businessDay.stationId,
    tankId,
    openingStock: num(dayTank.openingStock),
    returnLitres: num(dayTank.returnLitres),
    businessDateYmd: toYmdKarachi(dayTank.businessDay.businessDate),
  });

  await db.businessDayTank.update({
    where: { id: dayTank.id },
    data: { closingStock: computed.closingStock },
  });

  return computed;
}

/** Resolve open (or any) business day for a station on a Karachi YMD and sync one tank. */
export async function syncTankClosingForStationDate(
  db: Tx | PrismaClient,
  stationId: string,
  businessDateYmd: string,
  tankId: string
) {
  const businessDate = new Date(`${businessDateYmd}T00:00:00.000Z`);
  const day = await db.businessDay.findUnique({
    where: { stationId_businessDate: { stationId, businessDate } },
    select: { id: true },
  });
  if (!day) return null;
  return syncBusinessDayTankClosing(db, day.id, tankId);
}
