import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import * as db from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { getContabilidadGlobal } from "../../../../lib/accounting";
import { parsePeriodRange } from "../../../../lib/dateRange";
import type { Role } from "../../../../lib/db-types";

const ROLES: Role[] = ["CONTABLE", "MASTER"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type") || "income";

    const { dateStart, dateEnd } = parsePeriodRange(period, startDate, endDate);

    if (type === "income") {
      // Contabilidad: INGRESOS (compras), EGRESOS (premios pagados), GANANCIAS (restante)
      const contabilidad = await getContabilidadGlobal({ dateStart, dateEnd });
      const { ingresos, egresos, ganancias } = contabilidad;

      // Ingresos por día (compras confirmadas)
      const tickets = await db.tickets.findMany({
        where: { status: "CONFIRMED", purchasedAtGte: dateStart, purchasedAtLte: dateEnd },
        take: 50000,
      });
      const incomeByDay: Record<string, number> = {};
      tickets.forEach((ticket) => {
        const date = new Date(ticket.purchasedAt).toISOString().split("T")[0];
        incomeByDay[date] = (incomeByDay[date] || 0) + Number(ticket.totalPaid);
      });

      // Egresos por día (premios pagados)
      const paidClaims = await db.prizeClaims.findMany({
        where: { status: "PAID", processedAtGte: dateStart, processedAtLte: dateEnd },
        take: 10000,
      });
      const ticketIds = [...new Set(paidClaims.map((c) => c.ticketId))];
      const ticketList = ticketIds.length ? await db.tickets.findManyByIds(ticketIds) : [];
      const raffleIds = [...new Set(ticketList.map((t) => t.raffleId))];
      const raffles = await Promise.all(raffleIds.map((id) => db.raffles.findById(id)));
      const ticketMap = Object.fromEntries(ticketList.map((t) => [t.id, t]));
      const raffleMap = Object.fromEntries(raffles.filter(Boolean).map((r) => [r!.id, r!]));

      const egresosByDay: Record<string, number> = {};
      paidClaims.forEach((claim) => {
        if (claim.processedAt) {
          const date = new Date(claim.processedAt).toISOString().split("T")[0];
          let amount = Number(claim.paidAmount ?? 0);
          const ticket = ticketMap[claim.ticketId];
          const raffle = ticket ? raffleMap[ticket.raffleId] : null;
          if (claim.paidAmount == null && raffle?.prizes) {
            amount = estimateChartPrize(raffle.winningItem, raffle.prizes, ticket?.items);
          }
          egresosByDay[date] = (egresosByDay[date] || 0) + amount;
        }
      });

      // Crecimiento Neto: % variación GANANCIAS en últimas 48h vs 48h anteriores
      const now = new Date();
      const dateEnd48 = new Date(now);
      const dateStart48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const dateEndPrev48 = new Date(dateStart48.getTime());
      const dateStartPrev48 = new Date(dateStart48.getTime() - 48 * 60 * 60 * 1000);
      const [cont48, contPrev48] = await Promise.all([
        getContabilidadGlobal({ dateStart: dateStart48, dateEnd: dateEnd48 }),
        getContabilidadGlobal({ dateStart: dateStartPrev48, dateEnd: dateEndPrev48 })
      ]);
      const gananciasLast48 = cont48.ganancias;
      const gananciasPrev48 = contPrev48.ganancias;
      let netGrowthPercentage: number;
      if (gananciasPrev48 === 0) {
        netGrowthPercentage = gananciasLast48 > 0 ? 100 : gananciasLast48 < 0 ? -100 : 0;
      } else {
        netGrowthPercentage = ((gananciasLast48 - gananciasPrev48) / Math.abs(gananciasPrev48)) * 100;
      }

      const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd.getTime() - dateStart.getTime()));
      const previousPeriodEnd = new Date(dateStart.getTime() - 1);
      const contPrevious = await getContabilidadGlobal({ dateStart: previousPeriodStart, dateEnd: previousPeriodEnd });
      const growthPercentage = contPrevious.ingresos > 0
        ? ((ingresos - contPrevious.ingresos) / contPrevious.ingresos) * 100
        : ingresos > 0 ? 100 : 0;

      // Gráfico: todos los días del período con ingresos y egresos (sin huecos). Iteración por día UTC.
      const chartData: Array<{ date: string; ingresos: number; egresos: number; ganancias: number }> = [];
      const end = new Date(dateEnd);
      end.setUTCHours(23, 59, 59, 999);
      const maxChartDays = 400;
      const rangeMs = end.getTime() - dateStart.getTime();
      const chartStart = rangeMs > maxChartDays * 24 * 60 * 60 * 1000
        ? new Date(end.getTime() - maxChartDays * 24 * 60 * 60 * 1000)
        : new Date(dateStart);
      chartStart.setUTCHours(0, 0, 0, 0);
      const current = new Date(chartStart);
      while (current <= end) {
        const dateStr = current.toISOString().split("T")[0];
        const dayIngresos = Number((incomeByDay[dateStr] ?? 0).toFixed(2));
        const dayEgresos = Number((egresosByDay[dateStr] ?? 0).toFixed(2));
        chartData.push({
          date: dateStr,
          ingresos: dayIngresos,
          egresos: dayEgresos,
          ganancias: Number((dayIngresos - dayEgresos).toFixed(2))
        });
        current.setUTCDate(current.getUTCDate() + 1);
      }

      return NextResponse.json({
        ingresos: Number(ingresos.toFixed(2)),
        egresos: Number(egresos.toFixed(2)),
        ganancias: Number(ganancias.toFixed(2)),
        growthPercentage: Number(growthPercentage.toFixed(2)),
        netGrowthPercentage: Number(netGrowthPercentage.toFixed(2)),
        chartData,
        period: {
          start: dateStart.toISOString(),
          end: dateEnd.toISOString()
        }
      });
    } else if (type === "referrals") {
      const visits = await db.referralVisit.findMany({
        where: { createdAtGte: dateStart, createdAtLte: dateEnd },
        take: 50000,
      });
      const linkIds = [...new Set(visits.map((v) => v.referralLinkId))];
      const links = await Promise.all(linkIds.map((id) => db.referralLink.findById(id)));
      const linkMap = Object.fromEntries(links.filter(Boolean).map((l) => [l!.id, l!]));
      const withReferral = visits.filter((v) => linkMap[v.referralLinkId]).length;

      const allVisitsForUserCheck = await db.referralVisit.findMany({ take: 200000 });
      const userIdsWithVisits = new Set(allVisitsForUserCheck.map((v) => v.userId).filter(Boolean));
      const usersInRange = await db.users.findManyAdmin({
        createdAtGte: dateStart,
        createdAtLte: dateEnd,
        skip: 0,
        take: 50000,
      });
      const withoutReferral = usersInRange.filter((u) => !userIdsWithVisits.has(u.id)).length;

      const previousPeriodStart = new Date(dateStart.getTime() - (dateEnd.getTime() - dateStart.getTime()));
      const previousPeriodEnd = new Date(dateStart.getTime() - 1);

      const previousVisitsList = await db.referralVisit.findMany({
        where: { createdAtGte: previousPeriodStart, createdAtLte: previousPeriodEnd },
        take: 50000,
      });
      const previousUsersList = await db.users.findManyAdmin({
        createdAtGte: previousPeriodStart,
        createdAtLte: previousPeriodEnd,
        skip: 0,
        take: 50000,
      });
      const previousTotal = previousVisitsList.length + previousUsersList.length;
      const currentTotal = withReferral + withoutReferral;
      const growthPercentage = previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;

      const referralsByDay: Record<string, { withReferral: number; withoutReferral: number }> = {};
      visits.forEach((visit) => {
        const date = new Date(visit.createdAt).toISOString().split("T")[0];
        if (!referralsByDay[date]) referralsByDay[date] = { withReferral: 0, withoutReferral: 0 };
        if (linkMap[visit.referralLinkId]) referralsByDay[date].withReferral++;
      });

      const usersWithoutReferralInRange = usersInRange.filter((u) => !userIdsWithVisits.has(u.id));
      usersWithoutReferralInRange.forEach((user) => {
        const date = new Date(user.createdAt).toISOString().split("T")[0];
        if (!referralsByDay[date]) referralsByDay[date] = { withReferral: 0, withoutReferral: 0 };
        referralsByDay[date].withoutReferral++;
      });

      const chartData = Object.entries(referralsByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          withReferral: data.withReferral,
          withoutReferral: data.withoutReferral,
          total: data.withReferral + data.withoutReferral
        }));

      return NextResponse.json({
        withReferral,
        withoutReferral,
        total: currentTotal,
        growthPercentage: Number(growthPercentage.toFixed(2)),
        chartData,
        period: {
          start: dateStart.toISOString(),
          end: dateEnd.toISOString()
        }
      });
    } else if (type === "topUsers") {
      if (auth.role !== "MASTER") {
        return NextResponse.json({ error: "Solo MASTER puede ver top usuarios" }, { status: 403 });
      }

      const ticketsInRange = await db.tickets.findMany({
        where: { status: "CONFIRMED", purchasedAtGte: dateStart, purchasedAtLte: dateEnd },
        take: 100000,
      });
      const userIds = [...new Set(ticketsInRange.map((t) => t.userId))];
      const userList = userIds.length ? await db.users.findManyByIds(userIds) : [];
      const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));

      const totalByUser: Record<string, { totalPaid: number; count: number }> = {};
      ticketsInRange.forEach((t) => {
        if (!totalByUser[t.userId]) totalByUser[t.userId] = { totalPaid: 0, count: 0 };
        totalByUser[t.userId].totalPaid += Number(t.totalPaid);
        totalByUser[t.userId].count++;
      });

      const usersWithTotal = Object.entries(totalByUser)
        .map(([userId, data]) => {
          const user = userMap[userId];
          if (!user || user.role !== "USER") return null;
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            documentId: user.documentId,
            nationalId: user.nationalId,
            nationalIdType: user.nationalIdType,
            totalSpent: data.totalPaid,
            purchaseCount: data.count,
          };
        })
        .filter(Boolean) as { id: string; name: string; email: string; documentId: string; nationalId: string | null; nationalIdType: string | null; totalSpent: number; purchaseCount: number }[];
      usersWithTotal.sort((a, b) => b.totalSpent - a.totalSpent);

      return NextResponse.json({
        users: usersWithTotal,
        period: {
          start: dateStart.toISOString(),
          end: dateEnd.toISOString()
        }
      });
    }

    return NextResponse.json({ error: "Tipo de estadística inválido" }, { status: 400 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener estadísticas", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener estadísticas" }, { status: 500 });
  }
}

/** Fallback para chart: estima el premio desde raffle.prizes (misma lógica que accounting.ts) */
function estimateChartPrize(
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
