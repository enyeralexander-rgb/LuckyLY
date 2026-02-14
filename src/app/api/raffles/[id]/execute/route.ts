import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { newId } from "@/lib/id";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ROLES);
    const body = await request.json().catch(() => ({}));
    const providedWinners = (body.winners || []) as string[];

    const raffle = await db.raffles.findById(params.id);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }
    if (raffle.status === "FINISHED") {
      return NextResponse.json({ error: "El sorteo ya fue ejecutado" }, { status: 409 });
    }

    const ticketItemsList = await db.ticketItems.findMany({ raffleId: params.id });
    const confirmedItems = ticketItemsList.filter((t) => t.status === "CONFIRMED");
    const pendingItems = ticketItemsList.filter((t) => t.status === "PENDING");
    const rejectedItems = ticketItemsList.filter((t) => t.status === "REJECTED");

    if (confirmedItems.length !== raffle.slots) {
      const missing = raffle.slots - confirmedItems.length;
      return NextResponse.json({
        error: `No se puede ejecutar la ruleta. Faltan ${missing} cupo(s) por confirmar. Todos los cupos deben estar COMPRADOS y CONFIRMADOS por los administradores antes de ejecutar.`,
      }, { status: 400 });
    }
    if (pendingItems.length > 0) {
      return NextResponse.json({
        error: `No se puede ejecutar la ruleta. Hay ${pendingItems.length} cupo(s) pendientes de confirmación. Todos los cupos deben estar COMPRADOS y CONFIRMADOS antes de ejecutar.`,
      }, { status: 400 });
    }

    let winners: string[] = providedWinners;
    if (winners.length === 0) {
      const items = confirmedItems.map((t) => t.value);
      const blocked = new Set<string>();
      for (let i = 0; i < raffle.winnersCount; i++) {
        const available = items.filter((v) => !blocked.has(v));
        if (available.length === 0) break;
        const randomIndex = Math.floor(Math.random() * available.length);
        const winner = available[randomIndex];
        winners.push(winner);
        blocked.add(winner);
      }
    }

    const winner = winners.join(", ");

    await db.raffles.update(params.id, {
      status: "FINISHED",
      executedAt: new Date(),
      winningItem: winner,
    });

    const winningItemsSet = new Set(winners);
    const allTickets = await db.tickets.findMany({ where: { raffleId: params.id }, take: 10000 });

    for (const ticket of allTickets) {
      const ticketItems = Array.isArray(ticket.items)
        ? (ticket.items as unknown[]).filter((item): item is string => typeof item === "string")
        : [];
      const isWinner = ticketItems.some((item: string) => winningItemsSet.has(item));
      if (isWinner) {
        await db.tickets.update(ticket.id, { status: "WIN" });
        const existingClaim = await db.prizeClaims.findUnique({ ticketId: ticket.id });
        if (!existingClaim) {
          await db.prizeClaims.create({
            id: newId(),
            ticketId: ticket.id,
            userId: ticket.userId,
            status: "REQUESTED",
          });
        }
      }
    }

    if (ROLES.includes(auth.role)) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await db.auditLog.create({
        id: newId(),
        actorId: auth.userId,
        actorRole: auth.role,
        action: "EXECUTE_RAFFLE",
        entity: "Raffle",
        entityId: params.id,
        ip,
        meta: {
          title: raffle.title,
          type: raffle.type,
          winners,
          winner,
          executedAt: new Date().toISOString(),
          totalSlots: raffle.slots,
          winnersCount: raffle.winnersCount,
          prizes: raffle.prizes,
        },
      });
    }

    return NextResponse.json({ winner, winners });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al ejecutar sorteo" }, { status: 500 });
  }
}
