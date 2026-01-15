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
            type: true
          }
        }
      },
      orderBy: {
        ticket: {
          purchasedAt: "desc"
        }
      }
    });

    return NextResponse.json(pendingItems);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener cupos pendientes" }, { status: 500 });
  }
}

