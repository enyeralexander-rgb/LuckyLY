import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { newId } from "@/lib/id";
import type { Role } from "@/lib/db-types";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ["USER"] as Role[]);

    const ticketList = await db.tickets.findMany({
      where: { userId: auth.userId },
      take: 500,
    });

    const raffleIds = [...new Set(ticketList.map((t) => t.raffleId))];
    const raffles = await Promise.all(raffleIds.map((id) => db.raffles.findById(id)));
    const raffleMap: Record<string, NonNullable<(typeof raffles)[number]>> = {};
    for (const r of raffles) {
      if (r) raffleMap[r.id] = r;
    }

    const claims = await db.prizeClaims.findMany({ where: { userId: auth.userId }, take: 1000 });
    const claimByTicketId: Record<string, (typeof claims)[number]> = {};
    for (const c of claims) claimByTicketId[c.ticketId] = c;

    const updatedTickets = await Promise.all(
      ticketList.map(async (ticket) => {
        const raffle = raffleMap[ticket.raffleId];
        if (raffle?.status === "FINISHED" && raffle.winningItem) {
          const items = Array.isArray(ticket.items)
            ? (ticket.items as unknown[]).filter((item): item is string => typeof item === "string")
            : [];
          const isWinner = items.some((item: string) => raffle.winningItem?.includes(item));
          if (isWinner && ticket.status !== "WIN") {
            await db.tickets.update(ticket.id, { status: "WIN" });
            return { ...ticket, status: "WIN" as const };
          }
        }
        return ticket;
      })
    );

    const result = updatedTickets.map((ticket) => {
      const raffle = raffleMap[ticket.raffleId];
      const prizeClaim = claimByTicketId[ticket.id];
      return {
        ...ticket,
        raffle: raffle
          ? {
              id: raffle.id,
              title: raffle.title,
              type: raffle.type,
              status: raffle.status,
              winningItem: raffle.winningItem,
            }
          : null,
        prizeClaim: prizeClaim ? { status: prizeClaim.status } : null,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ["USER"] as Role[]);
    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId es obligatorio" }, { status: 400 });
    }

    const ticket = await db.tickets.findById(ticketId);
    if (!ticket || ticket.userId !== auth.userId) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    const raffle = await db.raffles.findById(ticket.raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    if (raffle.status !== "FINISHED" || !raffle.winningItem) {
      return NextResponse.json({ error: "Este ticket no es ganador" }, { status: 400 });
    }

    const items = Array.isArray(ticket.items)
      ? (ticket.items as unknown[]).filter((item): item is string => typeof item === "string")
      : [];
    const isWinner = items.some((item: string) => raffle.winningItem?.includes(item));

    if (!isWinner) {
      return NextResponse.json({ error: "Este ticket no es ganador" }, { status: 400 });
    }

    const existingClaim = await db.prizeClaims.findUnique({ ticketId });
    if (existingClaim) {
      return NextResponse.json({ error: "Ya existe un reclamo para este ticket" }, { status: 409 });
    }

    const claim = await db.prizeClaims.create({
      id: newId(),
      ticketId,
      userId: auth.userId,
      status: "REQUESTED",
    });

    return NextResponse.json({ id: claim.id, status: claim.status }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al registrar reclamo" }, { status: 500 });
  }
}
