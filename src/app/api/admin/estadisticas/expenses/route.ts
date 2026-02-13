import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { parsePeriodRange } from "../../../../../lib/dateRange";
import { Role } from "@prisma/client";

/**
 * GET /api/admin/estadisticas/expenses
 * Lista paginada de EGRESOS (premios pagados) con filtros.
 */
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const raffleId = searchParams.get("raffleId");
    const paymentRef = searchParams.get("paymentRef");

    // Filtro de fecha por processedAt (fecha de pago del premio)
    const where: any = { status: "PAID" };
    if (startDate || endDate) {
      where.processedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.processedAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.processedAt.lte = end;
      }
    }

    if (userId) {
      where.userId = userId;
    }

    if (raffleId) {
      where.ticket = { raffleId };
    }

    if (paymentRef) {
      where.paymentRef = { contains: paymentRef, mode: "insensitive" };
    }

    const [claims, total, totalSumAgg] = await Promise.all([
      prisma.prizeClaim.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true } },
          ticket: {
            select: {
              id: true,
              totalPaid: true,
              items: true,
              raffle: { select: { id: true, title: true, type: true, winningItem: true, prizes: true } }
            }
          }
        },
        orderBy: { processedAt: "desc" },
        skip,
        take: limit
      }),
      prisma.prizeClaim.count({ where }),
      prisma.prizeClaim.aggregate({
        where,
        _sum: { paidAmount: true }
      })
    ]);

    const expenses = claims.map((claim) => {
      let amount = Number(claim.paidAmount ?? 0);
      // Fallback para claims sin paidAmount
      if (claim.paidAmount == null && claim.ticket.raffle?.prizes) {
        amount = estimatePrize(
          claim.ticket.raffle.winningItem,
          claim.ticket.raffle.prizes,
          claim.ticket.items
        );
      }
      return {
        id: claim.id,
        fecha: claim.processedAt?.toISOString() || "",
        nombreGanador: claim.user.name,
        emailGanador: claim.user.email,
        tituloSorteo: claim.ticket.raffle?.title || "N/A",
        tipoSorteo: claim.ticket.raffle?.type || "N/A",
        referenciaPago: claim.paymentRef || null,
        montoPagado: amount,
        montoCompra: Number(claim.ticket.totalPaid),
        sorteoId: claim.ticket.raffle?.id || ""
      };
    });

    return NextResponse.json({
      expenses,
      totalSum: Number(totalSumAgg._sum.paidAmount ?? 0),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener lista de egresos", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener la lista de egresos" }, { status: 500 });
  }
}

/** Estima el premio desde raffle.prizes (fallback para paidAmount NULL) */
function estimatePrize(
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
