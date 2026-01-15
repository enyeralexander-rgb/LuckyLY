import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { requireAuth, AuthError } from "../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    
    const tickets = await prisma.ticket.findMany({
      where: { userId: auth.userId },
      include: {
        raffle: {
          select: {
            id: true,
            title: true,
            type: true,
            status: true,
            winningItem: true
          }
        },
        prizeClaim: {
          select: {
            status: true
          }
        }
      },
      orderBy: { purchasedAt: "desc" }
    });

    // Actualizar status de tickets ganadores
    const updatedTickets = await Promise.all(
      tickets.map(async (ticket) => {
        if (ticket.raffle.status === "FINISHED" && ticket.raffle.winningItem) {
          const items = Array.isArray(ticket.items) ? ticket.items.filter((item): item is string => typeof item === 'string') : [];
          const isWinner = items.some((item: string) =>
            ticket.raffle.winningItem?.includes(item)
          );
          
          if (isWinner && ticket.status !== "WIN") {
            await prisma.ticket.update({
              where: { id: ticket.id },
              data: { status: "WIN" }
            });
            return { ...ticket, status: "WIN" };
          }
        }
        return ticket;
      })
    );

    return NextResponse.json(updatedTickets);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener tickets" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { ticketId } = body;

    if (!ticketId) {
      return NextResponse.json({ error: "ticketId es obligatorio" }, { status: 400 });
    }

    const ticket = await prisma.ticket.findUnique({ 
      where: { id: ticketId },
      include: { raffle: true }
    });
    
    if (!ticket || ticket.userId !== auth.userId) {
      return NextResponse.json({ error: "Ticket no encontrado" }, { status: 404 });
    }

    if (ticket.raffle.status !== "FINISHED" || !ticket.raffle.winningItem) {
      return NextResponse.json({ error: "Este ticket no es ganador" }, { status: 400 });
    }

    const items = Array.isArray(ticket.items) ? ticket.items.filter((item): item is string => typeof item === 'string') : [];
    const isWinner = items.some((item: string) => 
      ticket.raffle.winningItem?.includes(item)
    );

    if (!isWinner) {
      return NextResponse.json({ error: "Este ticket no es ganador" }, { status: 400 });
    }

    // Verificar si ya existe un reclamo
    const existingClaim = await prisma.prizeClaim.findUnique({
      where: { ticketId }
    });

    if (existingClaim) {
      return NextResponse.json({ error: "Ya existe un reclamo para este ticket" }, { status: 409 });
    }

    const claim = await prisma.prizeClaim.create({
      data: {
        ticketId,
        userId: auth.userId,
        status: "REQUESTED"
      }
    });

    return NextResponse.json({ id: claim.id, status: claim.status }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al registrar reclamo" }, { status: 500 });
  }
}

