import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { getGlobalTotals } from "../../../../lib/accounting";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d"; // 24h, 7d, 30d, 90d, 180d, 365d, year, all, custom
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const type = searchParams.get("type") || "income"; // income, referrals, topUsers

    let dateStart: Date;
    let dateEnd: Date = new Date();

    // Calcular fechas según el período (purchasedAt/processedAt en DB están en UTC; usamos rango consistente)
    if (period === "custom" && startDate && endDate) {
      dateStart = new Date(startDate);
      dateStart.setHours(0, 0, 0, 0);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else if (period === "24h") {
      dateStart = new Date();
      dateStart.setHours(dateStart.getHours() - 24);
    } else if (period === "7d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 7);
    } else if (period === "30d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 30);
    } else if (period === "90d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 90);
    } else if (period === "180d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 180);
    } else if (period === "365d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 365);
    } else if (period === "year") {
      dateStart = new Date(new Date().getFullYear(), 0, 1);
      dateEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === "all") {
      dateStart = new Date("2000-01-01T00:00:00.000Z");
    } else {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 7);
    }

    if (type === "income") {
      // 1. Ingresos Totales: suma de todas las compras (tickets CONFIRMED) en el período
      // 2. Premios Pagados: suma de premios pagados a ganadores (PAID) en el período
      // 3. Ganancias Netas: Ingresos Totales - Premios Pagados
      // 4. Crecimiento Neto: % de cambio de Ganancias Netas respecto al período anterior (misma duración)
      const totals = await getGlobalTotals({ dateStart, dateEnd });
      const totalIncome = totals.totalRevenue;
      const totalPrizesPaid = totals.totalPrizesPaid;
      const netIncome = totals.companyMargin;

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

      // Egresos por día (premios pagados)
      const paidClaims = await prisma.prizeClaim.findMany({
        where: {
          status: "PAID",
          processedAt: { gte: dateStart, lte: dateEnd }
        },
        select: { paidAmount: true, processedAt: true }
      });
      const egresosByDay: Record<string, number> = {};
      paidClaims.forEach((claim) => {
        if (claim.processedAt) {
          const date = new Date(claim.processedAt).toISOString().split("T")[0];
          egresosByDay[date] = (egresosByDay[date] || 0) + Number(claim.paidAmount ?? 0);
        }
      });

      // Crecimiento Neto: % de cambio de Ganancias Netas en últimas 48h vs 48h anteriores
      const now = new Date();
      const dateEnd48 = new Date(now);
      const dateStart48 = new Date(now.getTime() - 48 * 60 * 60 * 1000);
      const dateEndPrev48 = new Date(dateStart48.getTime());
      const dateStartPrev48 = new Date(dateStart48.getTime() - 48 * 60 * 60 * 1000);
      const [totalsLast48, totalsPrev48] = await Promise.all([
        getGlobalTotals({ dateStart: dateStart48, dateEnd: dateEnd48 }),
        getGlobalTotals({ dateStart: dateStartPrev48, dateEnd: dateEndPrev48 })
      ]);
      const netIncomeLast48 = totalsLast48.companyMargin;
      const previousNetIncome48 = totalsPrev48.companyMargin;
      let netGrowthPercentage: number;
      if (previousNetIncome48 === 0) {
        netGrowthPercentage = netIncomeLast48 > 0 ? 100 : netIncomeLast48 < 0 ? -100 : 0;
      } else {
        netGrowthPercentage = ((netIncomeLast48 - previousNetIncome48) / Math.abs(previousNetIncome48)) * 100;
      }

      const previousPeriodStart = new Date(dateStart);
      previousPeriodStart.setTime(previousPeriodStart.getTime() - (dateEnd.getTime() - dateStart.getTime()));
      const previousTotals = await getGlobalTotals({
        dateStart: previousPeriodStart,
        dateEnd: dateStart
      });
      const growthPercentage = previousTotals.totalRevenue > 0
        ? ((totalIncome - previousTotals.totalRevenue) / previousTotals.totalRevenue) * 100
        : totalIncome > 0 ? 100 : 0;

      // Gráfico: todos los días del período con ingresos y egresos (sin huecos). Si el rango > 400 días, mostrar solo últimos 400 para no enviar miles de puntos.
      const chartData: Array<{ date: string; ingresos: number; egresos: number }> = [];
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
        chartData.push({
          date: dateStr,
          ingresos: Number((incomeByDay[dateStr] ?? 0).toFixed(2)),
          egresos: Number((egresosByDay[dateStr] ?? 0).toFixed(2))
        });
        current.setDate(current.getDate() + 1);
      }

      return NextResponse.json({
        totalIncome: Number(totalIncome.toFixed(2)),
        totalPrizesPaid: Number(totalPrizesPaid.toFixed(2)),
        netIncome: Number(netIncome.toFixed(2)),
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
