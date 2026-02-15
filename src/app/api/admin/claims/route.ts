import { NextResponse } from "next/server";
import { prizeClaims, users, tickets, raffles } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { getRevenueByRaffle } from "../../../../lib/accounting";
import { parsePrizeValue } from "../../../../lib/validators";
import type { Role } from "../../../../lib/db-types";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";
import { logger } from "../../../../lib/logger";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

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
    const auth = requireAuth(request, ROLES);

    const claims = await prizeClaims.findMany({
      where: { status: ["REQUESTED", "PROCESSING"] },
      take: 500,
    });

    if (claims.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = [...new Set(claims.map((c) => c.userId))];
    const ticketIds = [...new Set(claims.map((c) => c.ticketId))];
    const userMap = new Map<string, Awaited<ReturnType<typeof users.findById>>>();
    const ticketMap = new Map<string, Awaited<ReturnType<typeof tickets.findById>>>();
    const raffleMap = new Map<string, Awaited<ReturnType<typeof raffles.findById>>>();
    await Promise.all(userIds.map(async (id) => userMap.set(id, (await users.findById(id)) ?? null)));
    await Promise.all(ticketIds.map(async (id) => ticketMap.set(id, (await tickets.findById(id)) ?? null)));
    const raffleIds = [...new Set([...ticketMap.values()].filter(Boolean).map((t) => t!.raffleId))];
    await Promise.all(raffleIds.map(async (id) => raffleMap.set(id, (await raffles.findById(id)) ?? null)));

    const revenueByRaffle = await getRevenueByRaffle(raffleIds);

    const claimsWithSuggested = claims.map((claim) => {
      const user = userMap.get(claim.userId);
      const ticket = ticketMap.get(claim.ticketId);
      const raffle = ticket ? raffleMap.get(ticket.raffleId) : null;
      const userSelect = user
        ? { name: user.name, email: user.email, nationalId: user.nationalId, phoneNumber: user.phoneNumber, bank: user.bank, bankPhone: user.bankPhone }
        : null;
      const ticketSelect = ticket
        ? {
            id: ticket.id,
            totalPaid: ticket.totalPaid,
            items: ticket.items,
            raffleId: ticket.raffleId,
            paymentMethod: ticket.paymentMethod,
            paymentMobileRef: ticket.paymentMobileRef,
            raffle: raffle
              ? { id: raffle.id, title: raffle.title, winningItem: raffle.winningItem, winnersCount: raffle.winnersCount, prizes: raffle.prizes }
              : null,
          }
        : null;
      const fromRafflePrizes = getPrizeAmountFromRaffle(
        raffle?.winningItem ?? null,
        raffle?.prizes ?? null,
        ticket?.items ?? []
      );
      let suggestedPrize: number;
      if (fromRafflePrizes != null && fromRafflePrizes > 0) {
        suggestedPrize = Math.round(fromRafflePrizes * 100) / 100;
      } else {
        const revenue = ticket?.raffleId ? revenueByRaffle[ticket.raffleId] ?? 0 : 0;
        const winnersCount = raffle?.winnersCount ?? 1;
        suggestedPrize =
          revenue > 0
            ? Math.round((revenue * 0.7 / winnersCount) * 100) / 100
            : Number(ticket?.totalPaid ?? 0);
      }
      return {
        ...claim,
        userId: claim.userId,
        raffleId: ticket?.raffleId ?? null,
        user: userSelect,
        ticket: ticketSelect,
        suggestedPrize,
      };
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
