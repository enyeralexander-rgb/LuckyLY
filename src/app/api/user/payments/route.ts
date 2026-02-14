import { NextResponse } from "next/server";
import { tickets, raffles, prizeClaims, ticketItems } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";

const USER: Role = "USER";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const [ticketList, total] = await Promise.all([
      tickets.findMany({ where: { userId: auth.userId }, take: limit, skip }),
      tickets.count({ userId: auth.userId }),
    ]);

    const raffleIds = [...new Set(ticketList.map((t) => t.raffleId))];
    const raffleMap = new Map<string | null, Awaited<ReturnType<typeof raffles.findById>>>();
    await Promise.all(
      raffleIds.map(async (id) => {
        const r = await raffles.findById(id);
        raffleMap.set(id, r);
      })
    );
    const claimMap = new Map<string, Awaited<ReturnType<typeof prizeClaims.findUnique>>>();
    await Promise.all(
      ticketList.map(async (t) => {
        const c = await prizeClaims.findUnique({ ticketId: t.id });
        claimMap.set(t.id, c ?? null);
      })
    );
    const itemsMap = new Map<string, Awaited<ReturnType<typeof ticketItems.findMany>>>();
    await Promise.all(
      ticketList.map(async (t) => {
        const items = await ticketItems.findMany({ ticketId: t.id });
        itemsMap.set(t.id, items);
      })
    );

    const payments = ticketList.map((ticket) => {
      const raffle = raffleMap.get(ticket.raffleId) ?? null;
      const prizeClaim = claimMap.get(ticket.id) ?? null;
      const items = itemsMap.get(ticket.id) ?? [];
      const raffleSelect = raffle
        ? { id: raffle.id, title: raffle.title, type: raffle.type, winningItem: raffle.winningItem, executedAt: raffle.executedAt }
        : null;
      const claimSelect = prizeClaim
        ? { id: prizeClaim.id, status: prizeClaim.status, processedAt: prizeClaim.processedAt }
        : null;
      return {
        id: ticket.id,
        raffle: raffleSelect,
        items: Array.isArray(ticket.items) ? ticket.items : items,
        totalPaid: Number(ticket.totalPaid),
        paymentMethod: ticket.paymentMethod,
        paymentMobileRef: ticket.paymentMobileRef,
        status: ticket.status,
        purchasedAt: ticket.purchasedAt,
        isWinner: ticket.status === "WIN",
        prizeClaim: claimSelect,
      };
    });

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener historial de pagos" }, { status: 500 });
  }
}
