import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { getRevenueByRaffle } from "../../../../lib/accounting";
import { Role } from "@prisma/client";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";
import { logger } from "../../../../lib/logger";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const claims = await prisma.prizeClaim.findMany({
      where: { status: { in: ["REQUESTED", "PROCESSING"] } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            nationalId: true,
            phoneNumber: true,
            bank: true,
            bankPhone: true
          }
        },
        ticket: {
          select: {
            id: true,
            totalPaid: true,
            raffleId: true,
            paymentMethod: true,
            paymentMobileRef: true,
            raffle: {
              select: {
                id: true,
                title: true,
                winningItem: true,
                winnersCount: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Premio sugerido por reclamo: 70% recaudado del sorteo / winnersCount (fuente: lib/accounting)
    const raffleIds = [...new Set(claims.map((c) => c.ticket.raffleId).filter(Boolean))] as string[];
    const revenueByRaffle = await getRevenueByRaffle(raffleIds);
    const claimsWithSuggested = claims.map((claim) => {
      const revenue = claim.ticket.raffleId ? revenueByRaffle[claim.ticket.raffleId] ?? 0 : 0;
      const winnersCount = claim.ticket.raffle?.winnersCount ?? 1;
      const suggestedPrize =
        revenue > 0
          ? Math.round((revenue * 0.7 / winnersCount) * 100) / 100
          : Number(claim.ticket.totalPaid);
      return { ...claim, suggestedPrize };
    });

    return NextResponse.json(claimsWithSuggested);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isDatabaseConnectionError(err)) {
      logger.info("[Admin Claims API] DB no disponible, devolviendo vacío");
      return NextResponse.json([], { status: 200, headers: { "x-fallback": "db-unavailable" } });
    }
    return NextResponse.json({ error: "Error al obtener reclamos" }, { status: 500 });
  }
}

