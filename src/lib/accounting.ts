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
 *
 * Rangos de fecha: estadísticas y PDF usan parsePeriodRange (dateRange.ts), que define
 * dateStart/dateEnd en UTC para períodos 7d, 30d, etc., de modo que las cifras sean
 * coherentes con los filtros por Ticket.purchasedAt y PrizeClaim.processedAt.
 */

import { tickets, prizeClaims, raffles } from "./db";

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

  const ingresos =
    dateStart != null && dateEnd != null
      ? await tickets.sumConfirmedInDateRange({ purchasedAtGte: dateStart, purchasedAtLte: dateEnd })
      : await tickets.sumConfirmedInDateRange();

  const paidClaims =
    egressStart != null && egressEnd != null
      ? await prizeClaims.findMany({ where: { status: "PAID", processedAtGte: egressStart, processedAtLte: egressEnd }, take: 10000 })
      : await prizeClaims.findMany({ where: { status: "PAID" }, take: 10000 });

  let egresos = 0;
  for (const claim of paidClaims) {
    if (claim.paidAmount != null) {
      egresos += Number(claim.paidAmount);
    } else {
      const ticket = await tickets.findById(claim.ticketId);
      const raffle = ticket ? await raffles.findById(ticket.raffleId) : null;
      const estimated = estimatePrizeFromRaffle(
        raffle?.winningItem ?? null,
        raffle?.prizes ?? null,
        ticket?.items ?? null
      );
      egresos += estimated;
    }
  }

  return { ingresos, egresos, ganancias: ingresos - egresos };
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
  return tickets.sumConfirmedByRaffle(raffleId);
}

/** EGRESOS de un sorteo: suma de PrizeClaim.paidAmount (PAID). Montos definidos en CREAR SORTEO y pagados en PAGAR PREMIOS. */
export async function getRafflePrizesPaid(raffleId: string): Promise<number> {
  const claims = await prizeClaims.findManyPaidByRaffleId(raffleId);
  return claims.reduce((sum, c) => sum + Number(c.paidAmount ?? 0), 0);
}

/** GANANCIAS de un sorteo: recaudado − premios pagados. */
export async function getRaffleCompanyMargin(raffleId: string): Promise<number> {
  const [revenue, prizesPaid] = await Promise.all([getRaffleRevenue(raffleId), getRafflePrizesPaid(raffleId)]);
  return revenue - prizesPaid;
}

/** Premio sugerido por ganador (regla 70%): (recaudado × 0.70) / winnersCount. Solo referencia; el monto real es raffle.prizes. */
export async function getSuggestedPrizePerWinner(raffleId: string): Promise<number> {
  const [revenue, r] = await Promise.all([getRaffleRevenue(raffleId), raffles.findById(raffleId)]);
  const winnersCount = r?.winnersCount ?? 1;
  if (revenue <= 0) return 0;
  return Math.round((revenue * 0.7 / winnersCount) * 100) / 100;
}

export async function getRevenueByRaffle(raffleIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    raffleIds.map(async (id) => {
      out[id] = await tickets.sumConfirmedByRaffle(id);
    })
  );
  return out;
}

export async function getPrizesPaidByRaffle(raffleIds: string[]): Promise<Record<string, number>> {
  const out: Record<string, number> = {};
  await Promise.all(
    raffleIds.map(async (raffleId) => {
      const claims = await prizeClaims.findManyPaidByRaffleId(raffleId);
      out[raffleId] = claims.reduce((sum, c) => sum + Number(c.paidAmount ?? 0), 0);
    })
  );
  return out;
}

/** EGRESOS en un período (premios pagados por processedAt). */
export async function getTotalPrizesPaidInPeriod(dateStart: Date, dateEnd: Date): Promise<number> {
  return prizeClaims.sumPaidInDateRange(dateStart, dateEnd);
}
