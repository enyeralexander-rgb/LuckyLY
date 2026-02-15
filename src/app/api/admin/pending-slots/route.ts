import { NextResponse } from "next/server";
import { ticketItems, tickets, users, raffles } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);

    const pendingItems = await ticketItems.findMany({ status: "PENDING" });
    if (pendingItems.length === 0) {
      return NextResponse.json([]);
    }

    const ticketIds = [...new Set(pendingItems.map((i) => i.ticketId))];
    const ticketList = await Promise.all(ticketIds.map((id) => tickets.findById(id)));
    const ticketMap = new Map<string, NonNullable<Awaited<ReturnType<typeof tickets.findById>>>>();
    ticketList.forEach((t) => {
      if (t && t.paymentMethod === "MOBILE") ticketMap.set(t.id, t);
    });

    const mobileTicketIds = [...ticketMap.keys()];
    if (mobileTicketIds.length === 0) {
      return NextResponse.json([]);
    }

    const userIds = [...new Set([...ticketMap.values()].map((t) => t.userId))];
    const raffleIds = [...new Set([...ticketMap.values()].map((t) => t.raffleId))];
    const userMap = new Map<string, Awaited<ReturnType<typeof users.findById>>>();
    const raffleMap = new Map<string, Awaited<ReturnType<typeof raffles.findById>>>();
    await Promise.all([
      ...userIds.map(async (id) => userMap.set(id, (await users.findById(id)) ?? null)),
      ...raffleIds.map(async (id) => raffleMap.set(id, (await raffles.findById(id)) ?? null)),
    ]);

    const groupedByTicket: Record<
      string,
      { ticketId: string; items: Array<{ id: string; value: string }>; ticket: unknown; raffle: unknown }
    > = {};

    for (const item of pendingItems) {
      const ticket = ticketMap.get(item.ticketId);
      if (!ticket) continue;
      const user = userMap.get(ticket.userId);
      const raffle = raffleMap.get(ticket.raffleId);
      const ticketPayload = {
        id: ticket.id,
        purchasedAt: ticket.purchasedAt,
        totalPaid: ticket.totalPaid,
        paymentMobileRef: ticket.paymentMobileRef,
        user: user
          ? {
              name: user.name,
              email: user.email,
              nationalId: user.nationalId,
              phoneNumber: user.phoneNumber,
              bank: user.bank,
              bankPhone: user.bankPhone,
            }
          : null,
      };
      const rafflePayload = raffle
        ? { id: raffle.id, title: raffle.title, type: raffle.type, pricePerSlot: raffle.pricePerSlot }
        : null;
      if (!groupedByTicket[ticket.id]) {
        groupedByTicket[ticket.id] = {
          ticketId: ticket.id,
          items: [],
          ticket: ticketPayload,
          raffle: rafflePayload,
        };
      }
      groupedByTicket[ticket.id].items.push({ id: item.id, value: item.value });
    }

    const grouped = Object.values(groupedByTicket).sort(
      (a, b) => new Date((b.ticket as { purchasedAt: Date }).purchasedAt).getTime() - new Date((a.ticket as { purchasedAt: Date }).purchasedAt).getTime()
    );

    return NextResponse.json(grouped);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener cupos pendientes" }, { status: 500 });
  }
}
