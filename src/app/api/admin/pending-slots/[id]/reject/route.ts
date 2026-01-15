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
      // Eliminar el TicketItem para liberar el cupo
      await tx.ticketItem.delete({
        where: { id: itemId }
      });

      // Verificar si quedan cupos en el ticket
      const remainingItems = await tx.ticketItem.findMany({
        where: { ticketId: item.ticketId }
      });

      // Si no quedan cupos en el ticket, eliminar el ticket también
      if (remainingItems.length === 0) {
        await tx.ticket.delete({
          where: { id: item.ticketId }
        });
      } else {
        // Si quedan cupos, verificar si todos están confirmados
        const allConfirmed = remainingItems.every(i => i.status === "CONFIRMED");
        if (allConfirmed) {
          await tx.ticket.update({
            where: { id: item.ticketId },
            data: { status: "CONFIRMED" }
          });
        }
      }
    });

    // Obtener información del usuario para el log
    const user = await prisma.user.findUnique({
      where: { id: item.ticket.userId },
      select: { name: true, email: true }
    });

    // Registrar log de rechazo de cupo con todos los detalles
    if (auth.role === Role.AGENT || auth.role === Role.CONTABLE || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "REJECT_PENDING_SLOT",
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
            action: "RECHAZADO"
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al rechazar cupo" }, { status: 500 });
  }
}

