import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const raffleId = params.id;

    // Obtener todos los tickets del usuario en este sorteo (solo confirmados y pendientes)
    const userTickets = await prisma.ticket.findMany({
      where: { 
        raffleId, 
        userId: auth.userId,
        status: { in: ["CONFIRMED", "PENDING"] }
      },
      include: { 
        ticketItems: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] }
          }
        }
      }
    });

    // Contar el total de cupos comprados (confirmados o pendientes)
    const totalSlots = userTickets.reduce((sum, ticket) => {
      return sum + ticket.ticketItems.length;
    }, 0);

    return NextResponse.json({ count: totalSlots });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener cupos del usuario" }, { status: 500 });
  }
}

