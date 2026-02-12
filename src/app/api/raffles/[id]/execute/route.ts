import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json().catch(() => ({}));
    const providedWinners = body.winners || [];

    const raffle = await prisma.raffle.findUnique({
      where: { id: params.id },
      include: { ticketItems: true }
    });

    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    if (raffle.status !== "ACTIVE") {
      return NextResponse.json({ error: "El sorteo no está activo" }, { status: 400 });
    }

    // REGLA: Todos los cupos deben estar COMPRADOS (CONFIRMED) para ejecutar la ruleta
    // No se permiten cupos PENDING o REJECTED
    const confirmedItems = raffle.ticketItems.filter((t) => t.status === "CONFIRMED");
    const pendingItems = raffle.ticketItems.filter((t) => t.status === "PENDING");
    const rejectedItems = raffle.ticketItems.filter((t) => t.status === "REJECTED");
    
    if (confirmedItems.length !== raffle.slots) {
      const missing = raffle.slots - confirmedItems.length;
      return NextResponse.json({ 
        error: `No se puede ejecutar la ruleta. Faltan ${missing} cupo(s) por confirmar. Todos los cupos deben estar COMPRADOS y CONFIRMADOS por los administradores antes de ejecutar.` 
      }, { status: 400 });
    }
    
    if (pendingItems.length > 0) {
      return NextResponse.json({ 
        error: `No se puede ejecutar la ruleta. Hay ${pendingItems.length} cupo(s) pendientes de confirmación. Todos los cupos deben estar COMPRADOS y CONFIRMADOS antes de ejecutar.` 
      }, { status: 400 });
    }

    // Si se proporcionaron ganadores desde el frontend, usarlos
    // Si no, calcularlos aquí (fallback)
    let winners: string[] = providedWinners;
    
    if (winners.length === 0) {
      // Solo usar cupos confirmados para seleccionar ganadores
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

    // Actualizar el sorteo
    await prisma.raffle.update({
      where: { id: params.id },
      data: {
        status: "FINISHED",
        executedAt: new Date(),
        winningItem: winner
      }
    });

    // Actualizar estado de tickets ganadores y crear reclamos automáticamente
    const winningItemsSet = new Set(winners);
    
    // Obtener todos los tickets del sorteo con información del sorteo
    const allTickets = await prisma.ticket.findMany({
      where: { raffleId: params.id },
      include: { 
        ticketItems: true,
        raffle: {
          select: {
            title: true,
            type: true,
            prizes: true
          }
        }
      }
    });

    // Procesar cada ticket
    for (const ticket of allTickets) {
      const ticketItems = Array.isArray(ticket.items) ? ticket.items.filter((item): item is string => typeof item === 'string') : [];
      const isWinner = ticketItems.some((item: string) => winningItemsSet.has(item));
      
      if (isWinner) {
        // Actualizar estado del ticket a WIN
        await prisma.ticket.update({
          where: { id: ticket.id },
          data: { status: "WIN" }
        });

        // Crear reclamo automáticamente si no existe
        const existingClaim = await prisma.prizeClaim.findUnique({
          where: { ticketId: ticket.id }
        });

        if (!existingClaim) {
          await prisma.prizeClaim.create({
            data: {
              ticketId: ticket.id,
              userId: ticket.userId,
              status: "REQUESTED"
            }
          });
        }
      }
    }

    // Registrar log de ejecución de sorteo con todos los detalles
    if (auth.role === Role.AGENT || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "EXECUTE_RAFFLE",
          entity: "Raffle",
          entityId: params.id,
          ip,
          meta: {
            title: raffle.title,
            type: raffle.type,
            winners: winners,
            winner: winner,
            executedAt: new Date().toISOString(),
            totalSlots: raffle.slots,
            winnersCount: raffle.winnersCount,
            prizes: raffle.prizes
          }
        }
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

