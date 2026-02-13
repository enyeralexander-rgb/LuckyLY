import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { getRevenueByRaffle } from "../../../../lib/accounting";
import { parsePrizeValue } from "../../../../lib/validators";
import { Role } from "@prisma/client";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";
import { logger } from "../../../../lib/logger";

/** Obtiene el monto del premio según CREAR SORTEOS (raffle.prizes): 1º = prizes[0], 2º = prizes[1], 3º = prizes[2]. */
function getPrizeAmountFromRaffle(
  winningItem: string | null,
  prizes: unknown,
  ticketItems: unknown
): number | null {
  if (!winningItem || !prizes || !Array.isArray(prizes) || prizes.length === 0) return null;
  const winners = winningItem.split(",").map((s) => s.trim()).filter(Boolean);
  const items = Array.isArray(ticketItems) ? ticketItems.filter((x): x is string => typeof x === "string") : [];
  let winnerIndex = -1;
  for (const item of items) {
    const idx = winners.indexOf(item);
    if (idx !== -1 && (winnerIndex === -1 || idx < winnerIndex)) winnerIndex = idx;
  }
  if (winnerIndex < 0 || winnerIndex >= prizes.length) return null;
  const raw = prizes[winnerIndex];
  return typeof raw === "string" ? parsePrizeValue(raw) : null;
}

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
            items: true,
            raffleId: true,
            paymentMethod: true,
            paymentMobileRef: true,
            raffle: {
              select: {
                id: true,
                title: true,
                winningItem: true,
                winnersCount: true,
                prizes: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    const raffleIds = [...new Set(claims.map((c) => c.ticket.raffleId).filter(Boolean))] as string[];
    const revenueByRaffle = await getRevenueByRaffle(raffleIds);

    const claimsWithSuggested = claims.map((claim) => {
      const raffle = claim.ticket.raffle;
      const fromRafflePrizes = getPrizeAmountFromRaffle(
        raffle?.winningItem ?? null,
        raffle?.prizes ?? null,
        claim.ticket.items ?? []
      );
      if (fromRafflePrizes != null && fromRafflePrizes > 0) {
        return { ...claim, suggestedPrize: Math.round(fromRafflePrizes * 100) / 100 };
      }
      const revenue = claim.ticket.raffleId ? revenueByRaffle[claim.ticket.raffleId] ?? 0 : 0;
      const winnersCount = raffle?.winnersCount ?? 1;
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

