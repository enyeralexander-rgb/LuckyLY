import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    
    const pendingItems = await prisma.ticketItem.findMany({
      where: {
        status: "PENDING",
        ticket: {
          paymentMethod: "MOBILE"
        }
      },
      include: {
        ticket: {
          select: {
            id: true,
            purchasedAt: true,
            totalPaid: true,
            paymentMobileRef: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        raffle: {
          select: {
            id: true,
            title: true,
            type: true,
            pricePerSlot: true
          }
        }
      },
      orderBy: {
        ticket: {
          purchasedAt: "desc"
        }
      }
    });

    // Agrupar por ticketId para mostrar compras completas
    const groupedByTicket: Record<string, {
      ticketId: string;
      items: Array<{ id: string; value: string }>;
      ticket: any;
      raffle: any;
    }> = {};

    for (const item of pendingItems) {
      const ticketId = item.ticket.id;
      if (!groupedByTicket[ticketId]) {
        groupedByTicket[ticketId] = {
          ticketId,
          items: [],
          ticket: item.ticket,
          raffle: item.raffle
        };
      }
      groupedByTicket[ticketId].items.push({ id: item.id, value: item.value });
    }

    // Convertir a array y ordenar por fecha
    const grouped = Object.values(groupedByTicket).sort((a, b) => 
      new Date(b.ticket.purchasedAt).getTime() - new Date(a.ticket.purchasedAt).getTime()
    );

    return NextResponse.json(grouped);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener cupos pendientes" }, { status: 500 });
  }
}

