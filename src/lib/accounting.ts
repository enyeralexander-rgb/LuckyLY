/**
 * Módulo único de contabilidad (regla 70/30).
 * Fuente de verdad para: recaudado por sorteo, premios pagados, margen empresa.
 * 100% = recaudado (tickets CONFIRMED), 70% = pozo premios, 30% = empresa.
 */

import { prisma } from "./prisma";

/** Recaudado de un sorteo: suma de Ticket.totalPaid (tickets CONFIRMED de ese sorteo). */
export async function getRaffleRevenue(raffleId: string): Promise<number> {
  const r = await prisma.ticket.aggregate({
    where: { raffleId, status: "CONFIRMED" },
    _sum: { totalPaid: true }
  });
  return Number(r._sum.totalPaid ?? 0);
}

/** Premios ya pagados de un sorteo: suma de PrizeClaim.paidAmount (PAID, ticket del sorteo). */
export async function getRafflePrizesPaid(raffleId: string): Promise<number> {
  const claims = await prisma.prizeClaim.findMany({
    where: { status: "PAID", ticket: { raffleId } },
    select: { paidAmount: true }
  });
  return claims.reduce((sum, c) => sum + Number(c.paidAmount ?? 0), 0);
}

/** Margen empresa del sorteo: recaudado - premios pagados. */
export async function getRaffleCompanyMargin(raffleId: string): Promise<number> {
  const [revenue, prizesPaid] = await Promise.all([
    getRaffleRevenue(raffleId),
    getRafflePrizesPaid(raffleId)
  ]);
  return revenue - prizesPaid;
}

/** Premio sugerido por ganador: (recaudado × 0.70) / winnersCount. */
export async function getSuggestedPrizePerWinner(raffleId: string): Promise<number> {
  const [revenue, raffle] = await Promise.all([
    getRaffleRevenue(raffleId),
    prisma.raffle.findUnique({
      where: { id: raffleId },
      select: { winnersCount: true }
    })
  ]);
  const winnersCount = raffle?.winnersCount ?? 1;
  if (revenue <= 0) return 0;
  const prizePool = revenue * 0.7;
  return Math.round((prizePool / winnersCount) * 100) / 100;
}

/** Recaudado por varios sorteos en una consulta. */
export async function getRevenueByRaffle(raffleIds: string[]): Promise<Record<string, number>> {
  if (raffleIds.length === 0) return {};
  const aggregates = await prisma.ticket.groupBy({
    by: ["raffleId"],
    where: { raffleId: { in: raffleIds }, status: "CONFIRMED" },
    _sum: { totalPaid: true }
  });
  const out: Record<string, number> = {};
  for (const a of aggregates) {
    if (a.raffleId) out[a.raffleId] = Number(a._sum.totalPaid ?? 0);
  }
  return out;
}

/** Premios pagados por varios sorteos en una consulta. */
export async function getPrizesPaidByRaffle(raffleIds: string[]): Promise<Record<string, number>> {
  if (raffleIds.length === 0) return {};
  const claims = await prisma.prizeClaim.findMany({
    where: { status: "PAID", ticket: { raffleId: { in: raffleIds } } },
    select: { paidAmount: true, ticket: { select: { raffleId: true } } }
  });
  const out: Record<string, number> = {};
  for (const c of claims) {
    const rid = c.ticket.raffleId;
    out[rid] = (out[rid] ?? 0) + Number(c.paidAmount ?? 0);
  }
  return out;
}

export type GlobalTotalsOptions = {
  /** Filtro ingresos: tickets con purchasedAt en [dateStart, dateEnd]. */
  dateStart?: Date;
  dateEnd?: Date;
  /** Si no se pasan, se usan dateStart/dateEnd para egresos también. */
  dateStartEgress?: Date;
  dateEndEgress?: Date;
};

export type GlobalTotals = {
  totalRevenue: number;
  totalPrizesPaid: number;
  companyMargin: number;
};

/**
 * Totales globales: recaudado (tickets CONFIRMED), premios pagados (PAID), margen.
 * Si se pasan fechas, ingresos por purchasedAt y egresos por processedAt en esos rangos.
 */
export async function getGlobalTotals(options?: GlobalTotalsOptions): Promise<GlobalTotals> {
  const dateStart = options?.dateStart;
  const dateEnd = options?.dateEnd;
  const egressStart = options?.dateStartEgress ?? dateStart;
  const egressEnd = options?.dateEndEgress ?? dateEnd;

  const [revenueAgg, prizesAgg] = await Promise.all([
    prisma.ticket.aggregate({
      where: {
        status: "CONFIRMED",
        ...(dateStart != null && dateEnd != null
          ? { purchasedAt: { gte: dateStart, lte: dateEnd } }
          : {})
      },
      _sum: { totalPaid: true }
    }),
    prisma.prizeClaim.aggregate({
      where: {
        status: "PAID",
        ...(egressStart != null && egressEnd != null
          ? { processedAt: { gte: egressStart, lte: egressEnd } }
          : {})
      },
      _sum: { paidAmount: true }
    })
  ]);

  const totalRevenue = Number(revenueAgg._sum.totalPaid ?? 0);
  const totalPrizesPaid = Number(prizesAgg._sum.paidAmount ?? 0);

  return {
    totalRevenue,
    totalPrizesPaid,
    companyMargin: totalRevenue - totalPrizesPaid
  };
}

/** Para reportes por período: premios pagados en un rango de fechas (processedAt). */
export async function getTotalPrizesPaidInPeriod(dateStart: Date, dateEnd: Date): Promise<number> {
  const r = await prisma.prizeClaim.aggregate({
    where: {
      status: "PAID",
      processedAt: { gte: dateStart, lte: dateEnd }
    },
    _sum: { paidAmount: true }
  });
  return Number(r._sum.paidAmount ?? 0);
}
