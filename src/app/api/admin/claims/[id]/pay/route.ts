import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { claimPaySchema } from "../../../../../../lib/validators";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido (JSON)" }, { status: 400 });
    }
    const parsed = claimPaySchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }
    const { paymentRef, paidAmount } = parsed.data;

    const claimId = typeof params?.id === "string" ? params.id.trim() : "";
    if (!claimId) {
      return NextResponse.json({ error: "ID de reclamo inválido" }, { status: 400 });
    }

    const claim = await prisma.prizeClaim.findUnique({
      where: { id: claimId },
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
      where: { id: claimId },
      data: {
        status: "PAID",
        paymentRef,
        paidAmount,
        processedAt: new Date(),
        processedById: auth.userId
      }
    });

    // Obtener claim actualizado con paymentProof
    const updatedClaim = await prisma.prizeClaim.findUnique({
      where: { id: claimId },
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
          entityId: claimId,
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

