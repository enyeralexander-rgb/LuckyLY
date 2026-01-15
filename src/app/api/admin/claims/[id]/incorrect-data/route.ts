import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role, NotificationType } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);

    const claim = await prisma.prizeClaim.findUnique({
      where: { id: params.id },
      include: { 
        user: { select: { name: true, email: true } }, 
        ticket: { include: { raffle: true } } 
      }
    });

    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    // Crear notificación para el usuario
    await prisma.notification.create({
      data: {
        userId: claim.userId,
        type: NotificationType.SYSTEM,
        title: "⚠️ Datos Bancarios Incorrectos",
        message: `Tu reclamo de premio para el sorteo "${claim.ticket.raffle.title}" requiere que actualices tus datos bancarios. Por favor, ingresa a tu perfil y actualiza tu información bancaria.`,
        data: {
          claimId: claim.id,
          raffleId: claim.ticket.raffleId,
          raffleTitle: claim.ticket.raffle.title,
          action: "UPDATE_BANK_DATA"
        }
      }
    });

    // Enviar email al usuario
    const { sendIncorrectBankDataEmail } = await import("../../../../../../lib/email");
    await sendIncorrectBankDataEmail(
      claim.user.email,
      claim.user.name,
      claim.ticket.raffle.title
    );

    // Registrar log de acción
    if (auth.role === Role.AGENT || auth.role === Role.CONTABLE || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "MARK_CLAIM_INCORRECT_DATA",
          entity: "PrizeClaim",
          entityId: params.id,
          ip,
          meta: {
            userId: claim.userId,
            userName: claim.user.name,
            userEmail: claim.user.email,
            raffleId: claim.ticket.raffleId,
            raffleTitle: claim.ticket.raffle.title,
            action: "DATOS_INCORRECTOS",
            processedAt: new Date().toISOString()
          }
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al marcar datos incorrectos:", err);
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}
