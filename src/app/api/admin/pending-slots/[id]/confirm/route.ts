import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const itemId = params.id;

    const item = await prisma.ticketItem.findUnique({
      where: { id: itemId },
      include: { ticket: true, raffle: true }
    });

    if (!item) {
      return NextResponse.json({ error: "Cupo no encontrado" }, { status: 404 });
    }

    if (item.status !== "PENDING") {
      return NextResponse.json({ error: "Este cupo ya fue procesado" }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // Actualizar estado del cupo a CONFIRMED
      await tx.ticketItem.update({
        where: { id: itemId },
        data: { status: "CONFIRMED" }
      });

      // Verificar si todos los cupos del ticket están confirmados
      const allItems = await tx.ticketItem.findMany({
        where: { ticketId: item.ticketId }
      });

      const allConfirmed = allItems.every(i => i.status === "CONFIRMED");
      
      if (allConfirmed) {
        // Actualizar estado del ticket
        await tx.ticket.update({
          where: { id: item.ticketId },
          data: { status: "CONFIRMED" }
        });
      }
    });

    // Obtener información del usuario para el log
    const user = await prisma.user.findUnique({
      where: { id: item.ticket.userId },
      select: { name: true, email: true }
    });

    // Registrar log de confirmación de cupo con todos los detalles
    if (auth.role === Role.AGENT || auth.role === Role.CONTABLE || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "CONFIRM_PENDING_SLOT",
          entity: "TicketItem",
          entityId: itemId,
          ip,
          meta: {
            raffleId: item.raffleId,
            raffleTitle: item.raffle.title,
            value: item.value,
            userId: item.ticket.userId,
            userName: user?.name || "N/A",
            userEmail: user?.email || "N/A",
            ticketId: item.ticketId,
            paymentMobileRef: item.ticket.paymentMobileRef || null,
            action: "APROBADO"
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al confirmar cupo" }, { status: 500 });
  }
}

