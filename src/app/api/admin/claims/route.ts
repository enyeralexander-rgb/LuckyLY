import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const claims = await prisma.prizeClaim.findMany({
      where: { status: { in: ["REQUESTED", "PROCESSING"] } },
      include: {
        user: {
          select: {
            name: true,
            email: true,
            nationalId: true,
            phoneNumber: true,
            bank: true,
            bankPhone: true
          }
        },
        ticket: {
          select: {
            id: true,
            totalPaid: true,
            paymentMethod: true,
            paymentMobileRef: true,
            raffle: {
              select: {
                title: true,
                winningItem: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });
    
    return NextResponse.json(claims);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (isDatabaseConnectionError(err)) {
      console.info("ℹ️ [Admin Claims API] DB no disponible, devolviendo vacío");
      return NextResponse.json([], { status: 200, headers: { "x-fallback": "db-unavailable" } });
    }
    return NextResponse.json({ error: "Error al obtener reclamos" }, { status: 500 });
  }
}

