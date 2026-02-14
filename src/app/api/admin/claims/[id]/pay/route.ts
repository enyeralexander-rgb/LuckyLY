import { NextResponse } from "next/server";
import { prizeClaims, users, tickets, raffles, auditLog } from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import type { Role } from "../../../../../../lib/db-types";
import { newId } from "../../../../../../lib/id";
import { sendPrizePaymentEmail } from "../../../../../../lib/email";
import { getPrizeWinnerEmailTemplate } from "../../../../../../lib/prizeEmailTemplate";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ROLES);

    const claimId = typeof params?.id === "string" ? params.id.trim() : "";
    if (!claimId) {
      return NextResponse.json({ error: "ID de reclamo inválido" }, { status: 400 });
    }

    const claim = await prizeClaims.findById(claimId);
    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }
    if (claim.status === "PAID") {
      return NextResponse.json({ error: "Este reclamo ya fue pagado" }, { status: 409 });
    }

    const contentType = request.headers.get("content-type") || "";
    let paymentRef: string;
    let paidAmount: number;
    let proofBuffer: Buffer | null = null;
    let proofFilename: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const ref = formData.get("paymentRef");
      const amount = formData.get("paidAmount");
      const file = formData.get("file") as File | null;

      if (!ref || typeof ref !== "string" || !ref.trim()) {
        return NextResponse.json({ error: "Referencia de pago requerida" }, { status: 400 });
      }
      paymentRef = ref.trim();

      const num = amount != null ? Number(amount) : NaN;
      if (Number.isNaN(num) || num <= 0) {
        return NextResponse.json({ error: "Monto pagado inválido" }, { status: 400 });
      }
      paidAmount = num;

      if (!file || !(file instanceof File)) {
        return NextResponse.json({ error: "Debe adjuntar el comprobante de pago (archivo) para enviarlo por correo al ganador" }, { status: 400 });
      }
      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: "El comprobante debe ser una imagen (JPG, PNG, GIF, WEBP)" }, { status: 400 });
      }
      if (file.size > 5 * 1024 * 1024) {
        return NextResponse.json({ error: "El comprobante no puede superar 5MB" }, { status: 400 });
      }
      const bytes = await file.arrayBuffer();
      proofBuffer = Buffer.from(bytes);
      proofFilename = file.name;
    } else {
      return NextResponse.json({ error: "Envíe el formulario con referencia de pago, monto y archivo comprobante (multipart/form-data)" }, { status: 400 });
    }

    const user = await users.findById(claim.userId);
    const ticket = await tickets.findById(claim.ticketId);
    const raffle = ticket ? await raffles.findById(ticket.raffleId) : null;

    await prizeClaims.update(claimId, {
      status: "PAID",
      paymentRef,
      paidAmount,
      processedAt: new Date(),
      processedById: auth.userId,
    });

    const templateBody = await getPrizeWinnerEmailTemplate();
    if (user && raffle) {
      await sendPrizePaymentEmail(user.email, user.name, raffle.title, templateBody, proofBuffer ?? undefined, proofFilename);
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "PAY_PRIZE",
      entity: "PrizeClaim",
      entityId: claimId,
      ip,
      meta: {
        userId: claim.userId,
        userName: user?.name ?? "N/A",
        userEmail: user?.email ?? "N/A",
        raffleId: ticket?.raffleId ?? null,
        raffleTitle: raffle?.title ?? "N/A",
        paymentRef,
        action: "APROBADO",
        processedAt: new Date().toISOString(),
      },
    });

    const updatedClaim = await prizeClaims.findById(claimId);
    return NextResponse.json(updatedClaim ?? claim);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al procesar pago" }, { status: 500 });
  }
}
