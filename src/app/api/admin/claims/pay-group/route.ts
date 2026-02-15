import { NextResponse } from "next/server";
import { prizeClaims, users, tickets, raffles, auditLog } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";
import { newId } from "../../../../../lib/id";
import { sendPrizePaymentEmail } from "../../../../../lib/email";
import { getPrizeWinnerEmailTemplate } from "../../../../../lib/prizeEmailTemplate";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Envíe el formulario con claimIds, referencia, monto total y comprobante (multipart/form-data)" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const claimIdsRaw = formData.get("claimIds");
    const ref = formData.get("paymentRef");
    const amount = formData.get("paidAmount");
    const file = formData.get("file") as File | null;

    let claimIds: string[];
    try {
      const parsed = typeof claimIdsRaw === "string" ? JSON.parse(claimIdsRaw) : claimIdsRaw;
      claimIds = Array.isArray(parsed) ? parsed.filter((id: unknown) => typeof id === "string" && id.trim()) : [];
    } catch {
      return NextResponse.json({ error: "claimIds debe ser un JSON con array de IDs" }, { status: 400 });
    }
    if (claimIds.length === 0) {
      return NextResponse.json({ error: "Debe enviar al menos un ID de reclamo" }, { status: 400 });
    }

    if (!ref || typeof ref !== "string" || !ref.trim()) {
      return NextResponse.json({ error: "Referencia de pago requerida" }, { status: 400 });
    }
    const paymentRef = ref.trim();

    const num = amount != null ? Number(amount) : NaN;
    if (Number.isNaN(num) || num <= 0) {
      return NextResponse.json({ error: "Monto total pagado inválido" }, { status: 400 });
    }
    const paidAmount = num;

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "Debe adjuntar el comprobante de pago (archivo) para enviarlo por correo al ganador" },
        { status: 400 }
      );
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "El comprobante debe ser una imagen (JPG, PNG, GIF, WEBP)" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El comprobante no puede superar 5MB" }, { status: 400 });
    }
    const bytes = await file.arrayBuffer();
    const proofBuffer = Buffer.from(bytes);
    const proofFilename = file.name;

    const claims = await Promise.all(claimIds.map((id) => prizeClaims.findById(id)));
    const validClaims = claims.filter((c): c is NonNullable<typeof c> => c != null);
    if (validClaims.length !== claimIds.length) {
      return NextResponse.json({ error: "Uno o más reclamos no existen" }, { status: 404 });
    }

    const userId = validClaims[0].userId;
    const ticket = await tickets.findById(validClaims[0].ticketId);
    const raffleId = ticket?.raffleId ?? null;
    const allSameUser = validClaims.every((c) => c.userId === userId);
    if (!allSameUser) {
      return NextResponse.json({ error: "Todos los reclamos deben ser del mismo usuario" }, { status: 400 });
    }

    const ticketIds = [...new Set(validClaims.map((c) => c.ticketId))];
    const ticketsList = await Promise.all(ticketIds.map((id) => tickets.findById(id)));
    const allSameRaffle = ticketsList.every((t) => t && t.raffleId === raffleId);
    if (!raffleId || !allSameRaffle) {
      return NextResponse.json({ error: "Todos los reclamos deben ser del mismo sorteo" }, { status: 400 });
    }

    const allowedStatuses = ["REQUESTED", "PROCESSING"];
    const allPending = validClaims.every((c) => allowedStatuses.includes(c.status));
    if (!allPending) {
      return NextResponse.json({ error: "Uno o más reclamos ya fueron pagados o no están pendientes" }, { status: 409 });
    }

    const now = new Date();
    for (const claim of validClaims) {
      await prizeClaims.update(claim.id, {
        status: "PAID",
        paymentRef,
        paidAmount,
        processedAt: now,
        processedById: auth.userId,
      });
    }

    const user = await users.findById(userId);
    const raffle = raffleId ? await raffles.findById(raffleId) : null;
    const templateBody = await getPrizeWinnerEmailTemplate();
    if (user && raffle) {
      await sendPrizePaymentEmail(user.email, user.name, raffle.title, templateBody, proofBuffer, proofFilename);
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "PAY_PRIZE",
      entity: "PrizeClaim",
      entityId: validClaims[0].id,
      ip,
      meta: {
        groupPay: true,
        claimIds: validClaims.map((c) => c.id),
        userId,
        userName: user?.name ?? "N/A",
        userEmail: user?.email ?? "N/A",
        raffleId,
        raffleTitle: raffle?.title ?? "N/A",
        paymentRef,
        paidAmount,
        action: "APROBADO",
        processedAt: now.toISOString(),
      },
    });

    return NextResponse.json({
      ok: true,
      paidCount: validClaims.length,
      paidAmount,
      claimIds: validClaims.map((c) => c.id),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al procesar pago del grupo" }, { status: 500 });
  }
}
