import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { getContabilidadGlobal } from "../../../../lib/accounting";
import { parsePeriodRange } from "../../../../lib/dateRange";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
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
      const tickets = await prisma.ticket.findMany({
        where: {
          status: "CONFIRMED",
          purchasedAt: { gte: dateStart, lte: dateEnd }
        },
        select: { totalPaid: true, purchasedAt: true }
      });
      const incomeByDay: Record<string, number> = {};
      tickets.forEach((ticket) => {
        const date = new Date(ticket.purchasedAt).toISOString().split("T")[0];
        incomeByDay[date] = (incomeByDay[date] || 0) + Number(ticket.totalPaid);
      });

      // Egresos por día (premios pagados) — incluye fallback para paidAmount NULL
      const paidClaims = await prisma.prizeClaim.findMany({
        where: {
          status: "PAID",
          processedAt: { gte: dateStart, lte: dateEnd }
        },
        select: {
          paidAmount: true,
          processedAt: true,
          ticket: {
            select: {
              items: true,
              raffle: { select: { winningItem: true, prizes: true, pricePerSlot: true, slots: true } }
            }
          }
        }
      });
      const egresosByDay: Record<string, number> = {};
      paidClaims.forEach((claim) => {
        if (claim.processedAt) {
          const date = new Date(claim.processedAt).toISOString().split("T")[0];
          let amount = Number(claim.paidAmount ?? 0);
          // Fallback para claims legacy sin paidAmount
          if (claim.paidAmount == null && claim.ticket.raffle?.prizes) {
            amount = estimateChartPrize(
              claim.ticket.raffle.winningItem,
              claim.ticket.raffle.prizes,
              claim.ticket.items
            );
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

      const previousPeriodStart = new Date(dateStart);
      previousPeriodStart.setTime(previousPeriodStart.getTime() - (dateEnd.getTime() - dateStart.getTime()));
      const contPrevious = await getContabilidadGlobal({ dateStart: previousPeriodStart, dateEnd: dateStart });
      const growthPercentage = contPrevious.ingresos > 0
        ? ((ingresos - contPrevious.ingresos) / contPrevious.ingresos) * 100
        : ingresos > 0 ? 100 : 0;

      // Gráfico: todos los días del período con ingresos y egresos (sin huecos)
      const chartData: Array<{ date: string; ingresos: number; egresos: number; ganancias: number }> = [];
      const end = new Date(dateEnd);
      end.setHours(23, 59, 59, 999);
      const maxChartDays = 400;
      const rangeMs = end.getTime() - dateStart.getTime();
      const chartStart = rangeMs > maxChartDays * 24 * 60 * 60 * 1000
        ? new Date(end.getTime() - maxChartDays * 24 * 60 * 60 * 1000)
        : new Date(dateStart);
      chartStart.setHours(0, 0, 0, 0);
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
        current.setDate(current.getDate() + 1);
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
      // Estadísticas de referencias
      const visits = await prisma.referralVisit.findMany({
        where: {
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          }
        },
        include: {
          referralLink: true
        }
      });

      const withReferral = visits.filter(v => v.referralLink).length;
      const withoutReferral = await prisma.user.count({
        where: {
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          },
          referralVisits: {
            none: {}
          }
        }
      });

      // Calcular crecimiento
      const previousPeriodStart = new Date(dateStart);
      previousPeriodStart.setTime(previousPeriodStart.getTime() - (dateEnd.getTime() - dateStart.getTime()));
      const previousPeriodEnd = dateStart;

      const previousVisits = await prisma.referralVisit.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      });

      const previousUsers = await prisma.user.count({
        where: {
          createdAt: {
            gte: previousPeriodStart,
            lte: previousPeriodEnd
          }
        }
      });

      const currentTotal = withReferral + withoutReferral;
      const previousTotal = previousVisits + previousUsers;
      const growthPercentage = previousTotal > 0 
        ? ((currentTotal - previousTotal) / previousTotal) * 100 
        : 0;

      // Datos por día
      const referralsByDay: Record<string, { withReferral: number; withoutReferral: number }> = {};
      
      visits.forEach((visit) => {
        const date = new Date(visit.createdAt).toISOString().split("T")[0];
        if (!referralsByDay[date]) {
          referralsByDay[date] = { withReferral: 0, withoutReferral: 0 };
        }
        if (visit.referralLink) {
          referralsByDay[date].withReferral++;
        }
      });

      // Agregar usuarios sin referral
      const usersWithoutReferral = await prisma.user.findMany({
        where: {
          createdAt: {
            gte: dateStart,
            lte: dateEnd
          },
          referralVisits: {
            none: {}
          }
        },
        select: {
          createdAt: true
        }
      });

      usersWithoutReferral.forEach((user) => {
        const date = new Date(user.createdAt).toISOString().split("T")[0];
        if (!referralsByDay[date]) {
          referralsByDay[date] = { withReferral: 0, withoutReferral: 0 };
        }
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
      // Top usuarios (solo MASTER)
      if (auth.role !== Role.MASTER) {
        return NextResponse.json({ error: "Solo MASTER puede ver top usuarios" }, { status: 403 });
      }

      const users = await prisma.user.findMany({
        where: {
          role: "USER",
          tickets: {
            some: {
              status: "CONFIRMED",
              purchasedAt: {
                gte: dateStart,
                lte: dateEnd
              }
            }
          }
        },
        include: {
          tickets: {
            where: {
              status: "CONFIRMED",
              purchasedAt: {
                gte: dateStart,
                lte: dateEnd
              }
            },
            select: {
              totalPaid: true,
              purchasedAt: true
            }
          }
        }
      });

      const usersWithTotal = users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        documentId: user.documentId,
        nationalId: user.nationalId,
        nationalIdType: user.nationalIdType,
        totalSpent: user.tickets.reduce((sum, t) => sum + Number(t.totalPaid), 0),
        purchaseCount: user.tickets.length
      })).sort((a, b) => b.totalSpent - a.totalSpent);

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
