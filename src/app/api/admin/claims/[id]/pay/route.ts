import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const { paymentRef } = await request.json();

    if (!paymentRef) {
      return NextResponse.json({ error: "Referencia de pago requerida" }, { status: 400 });
    }

    const claim = await prisma.prizeClaim.findUnique({
      where: { id: params.id },
      include: { user: { select: { name: true, email: true } }, ticket: { include: { raffle: true } } }
    });

    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    // Verificar que tenga comprobante de pago
    if (!claim.paymentProof) {
      return NextResponse.json({ error: "Debe adjuntar un comprobante de pago antes de confirmar" }, { status: 400 });
    }

    await prisma.prizeClaim.update({
      where: { id: params.id },
      data: {
        status: "PAID",
        paymentRef,
        processedAt: new Date(),
        processedById: auth.userId
      }
    });

    // Obtener claim actualizado con paymentProof
    const updatedClaim = await prisma.prizeClaim.findUnique({
      where: { id: params.id },
      include: { user: { select: { name: true, email: true } }, ticket: { include: { raffle: true } } }
    });

    // Enviar email con comprobante al cliente
    if (updatedClaim?.paymentProof) {
      const { sendPrizePaymentEmail } = await import("../../../../../../lib/email");
      await sendPrizePaymentEmail(
        updatedClaim.user.email,
        updatedClaim.user.name,
        updatedClaim.ticket.raffle.title,
        updatedClaim.paymentProof
      );
    }

    // Registrar log de pago de premio con todos los detalles
    if (auth.role === Role.AGENT || auth.role === Role.CONTABLE || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "PAY_PRIZE",
          entity: "PrizeClaim",
          entityId: params.id,
          ip,
          meta: {
            userId: claim.userId,
            userName: claim.user.name,
            userEmail: claim.user.email,
            raffleId: claim.ticket.raffleId,
            raffleTitle: claim.ticket.raffle.title,
            paymentRef,
            action: "APROBADO",
            processedAt: new Date().toISOString()
          }
        }
      });
    }

    return NextResponse.json(claim);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}

