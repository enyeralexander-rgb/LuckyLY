/**
 * =============================================================================
 * CONTABILIDAD DEL PROYECTO — Fuente única de verdad
 * =============================================================================
 *
 * AUDITORÍA Y MODELO CONTABLE:
 *
 * 1. INGRESOS
 *    = Todos los pagos realizados por los usuarios (por vida o en un período).
 *    Origen: compra de cupos en sorteos.
 *    - CREAR SORTEO define "Precio por cupo (Bs.)" → cada compra genera un Ticket
 *      con totalPaid = suma de (precio × cupos comprados).
 *    - Fuente en BD: Ticket.totalPaid donde status = "CONFIRMED".
 *    - Filtro por período: Ticket.purchasedAt en [dateStart, dateEnd].
 *
 * 2. EGRESOS
 *    = Pago de premios a los ganadores.
 *    - CREAR SORTEO define "Premios (Bs.)" (1–3 montos, máx 70% del total del sorteo).
 *    - PAGAR PREMIOS usa esos montos (raffle.prizes) al marcar cada reclamo como pagado;
 *      el monto se guarda en PrizeClaim.paidAmount.
 *    - Fuente en BD: PrizeClaim.paidAmount donde status = "PAID".
 *    - Filtro por período: PrizeClaim.processedAt en [dateStart, dateEnd].
 *
 * 3. GANANCIAS
 *    = Restante: INGRESOS − EGRESOS.
 *    Equivale al 30% del valor total de los sorteos (regla 70/30) menos ajustes
 *    por premios ya pagados.
 *
 * Vínculo entre módulos:
 * - CREAR SORTEO: pricePerSlot → INGRESOS (vía Ticket.totalPaid); prizes → EGRESOS (vía PrizeClaim.paidAmount en PAGAR PREMIOS).
 * - PAGAR PREMIOS: refleja y paga el premio definido en CREAR SORTEO (Premios Bs.).
 *
 * Cualquier total o reporte de ingresos/egresos/ganancias debe usar este módulo.
 */

import { prisma } from "./prisma";

// -----------------------------------------------------------------------------
// Contabilidad global (INGRESOS / EGRESOS / GANANCIAS)
// -----------------------------------------------------------------------------

export type ContabilidadOptions = {
  /** Rango de fechas para INGRESOS: Ticket.purchasedAt en [dateStart, dateEnd]. Sin fechas = por vida. */
  dateStart?: Date;
  dateEnd?: Date;
  /** Rango para EGRESOS (por defecto = mismo que ingresos): PrizeClaim.processedAt. */
  dateStartEgress?: Date;
  dateEndEgress?: Date;
};

export type ContabilidadGlobal = {
  /** INGRESOS: suma de todos los pagos de usuarios (Ticket CONFIRMED, totalPaid). */
  ingresos: number;
  /** EGRESOS: suma de premios pagados a ganadores (PrizeClaim PAID, paidAmount). */
  egresos: number;
  /** GANANCIAS: ingresos − egresos. */
  ganancias: number;
};

/**
 * Totales de contabilidad: INGRESOS, EGRESOS, GANANCIAS.
 * Única fuente de verdad para el módulo Estadísticas, PDF y dashboard.
 *
 * EGRESOS: usa PrizeClaim.paidAmount; para claims legacy con paidAmount=NULL,
 * estima el monto desde raffle.prizes según la posición del ganador.
 */
export async function getContabilidadGlobal(options?: ContabilidadOptions): Promise<ContabilidadGlobal> {
  const dateStart = options?.dateStart;
  const dateEnd = options?.dateEnd;
  const egressStart = options?.dateStartEgress ?? dateStart;
  const egressEnd = options?.dateEndEgress ?? dateEnd;

  const dateFilter = dateStart != null && dateEnd != null ? { purchasedAt: { gte: dateStart, lte: dateEnd } } : {};
  const egressDateFilter = egressStart != null && egressEnd != null ? { processedAt: { gte: egressStart, lte: egressEnd } } : {};

  // INGRESOS: suma directa (siempre tiene totalPaid)
  const revenueAgg = await prisma.ticket.aggregate({
    where: { status: "CONFIRMED", ...dateFilter },
    _sum: { totalPaid: true }
  });
  const ingresos = Number(revenueAgg._sum.totalPaid ?? 0);

  // EGRESOS: suma de paidAmount + fallback para claims con paidAmount NULL
  const paidClaims = await prisma.prizeClaim.findMany({
    where: { status: "PAID", ...egressDateFilter },
    select: {
      paidAmount: true,
      ticket: {
        select: {
          items: true,
          raffle: { select: { winningItem: true, prizes: true } }
        }
      }
    }
  });

  let egresos = 0;
  for (const claim of paidClaims) {
    if (claim.paidAmount != null) {
      egresos += Number(claim.paidAmount);
    } else {
      // Fallback: estimar desde raffle.prizes
      const estimated = estimatePrizeFromRaffle(
        claim.ticket.raffle?.winningItem ?? null,
        claim.ticket.raffle?.prizes ?? null,
        claim.ticket.items
      );
      egresos += estimated;
    }
  }

  return {
    ingresos,
    egresos,
    ganancias: ingresos - egresos
  };
}

/** Estima el monto del premio según la posición del ganador en raffle.prizes */
function estimatePrizeFromRaffle(
  winningItem: string | null,
  prizes: unknown,
  ticketItems: unknown
): number {
  if (!winningItem || !prizes || !Array.isArray(prizes) || prizes.length === 0) return 0;
  const winners = winningItem.split(",").map(s => s.trim()).filter(Boolean);
  const items = Array.isArray(ticketItems) ? ticketItems.filter((x): x is string => typeof x === "string") : [];
  let winnerIndex = -1;
  for (const item of items) {
    const idx = winners.indexOf(item);
    if (idx !== -1 && (winnerIndex === -1 || idx < winnerIndex)) winnerIndex = idx;
  }
  if (winnerIndex < 0 || winnerIndex >= prizes.length) return 0;
  const raw = prizes[winnerIndex];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const match = raw.trim().match(/(\d+(?:[.,]\d+)?)/);
    return match ? parseFloat(match[1].replace(",", ".")) || 0 : parseFloat(raw) || 0;
  }
  return 0;
}

// -----------------------------------------------------------------------------
// Compatibilidad con código existente (alias)
// -----------------------------------------------------------------------------

export type GlobalTotalsOptions = ContabilidadOptions;

export type GlobalTotals = {
  totalRevenue: number;
  totalPrizesPaid: number;
  companyMargin: number;
};

/** @deprecated Preferir getContabilidadGlobal(). Mantenido para compatibilidad. */
export async function getGlobalTotals(options?: GlobalTotalsOptions): Promise<GlobalTotals> {
  const c = await getContabilidadGlobal(options);
  return {
    totalRevenue: c.ingresos,
    totalPrizesPaid: c.egresos,
    companyMargin: c.ganancias
  };
}

// -----------------------------------------------------------------------------
// Por sorteo (recaudado, premios pagados, margen)
// -----------------------------------------------------------------------------

/** INGRESOS de un sorteo: suma de Ticket.totalPaid (tickets CONFIRMED de ese sorteo). */
export async function getRaffleRevenue(raffleId: string): Promise<number> {
  const r = await prisma.ticket.aggregate({
    where: { raffleId, status: "CONFIRMED" },
    _sum: { totalPaid: true }
  });
  return Number(r._sum.totalPaid ?? 0);
}

/** EGRESOS de un sorteo: suma de PrizeClaim.paidAmount (PAID). Montos definidos en CREAR SORTEO y pagados en PAGAR PREMIOS. */
export async function getRafflePrizesPaid(raffleId: string): Promise<number> {
  const claims = await prisma.prizeClaim.findMany({
    where: { status: "PAID", ticket: { raffleId } },
    select: { paidAmount: true }
  });
  return claims.reduce((sum, c) => sum + Number(c.paidAmount ?? 0), 0);
}

/** GANANCIAS de un sorteo: recaudado − premios pagados. */
export async function getRaffleCompanyMargin(raffleId: string): Promise<number> {
  const [revenue, prizesPaid] = await Promise.all([getRaffleRevenue(raffleId), getRafflePrizesPaid(raffleId)]);
  return revenue - prizesPaid;
}

/** Premio sugerido por ganador (regla 70%): (recaudado × 0.70) / winnersCount. Solo referencia; el monto real es raffle.prizes. */
export async function getSuggestedPrizePerWinner(raffleId: string): Promise<number> {
  const [revenue, raffle] = await Promise.all([
    getRaffleRevenue(raffleId),
    prisma.raffle.findUnique({ where: { id: raffleId }, select: { winnersCount: true } })
  ]);
  const winnersCount = raffle?.winnersCount ?? 1;
  if (revenue <= 0) return 0;
  return Math.round((revenue * 0.7 / winnersCount) * 100) / 100;
}

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

/** EGRESOS en un período (premios pagados por processedAt). */
export async function getTotalPrizesPaidInPeriod(dateStart: Date, dateEnd: Date): Promise<number> {
  const r = await prisma.prizeClaim.aggregate({
    where: { status: "PAID", processedAt: { gte: dateStart, lte: dateEnd } },
    _sum: { paidAmount: true }
  });
  return Number(r._sum.paidAmount ?? 0);
}
