import { NextResponse } from "next/server";
import { prizeClaims, users, tickets, raffles, auditLog } from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import type { Role } from "../../../../../../lib/db-types";
import { newId } from "../../../../../../lib/id";
import { sendIncorrectBankDataEmail } from "../../../../../../lib/email";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ROLES);

    const claim = await prizeClaims.findById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    const user = await users.findById(claim.userId);
    const ticket = await tickets.findById(claim.ticketId);
    const raffle = ticket ? await raffles.findById(ticket.raffleId) : null;

    if (user && raffle) {
      await sendIncorrectBankDataEmail(user.email, user.name, raffle.title);
    }

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "MARK_CLAIM_INCORRECT_DATA",
      entity: "PrizeClaim",
      entityId: params.id,
      ip,
      meta: {
        userId: claim.userId,
        userName: user?.name ?? "N/A",
        userEmail: user?.email ?? "N/A",
        raffleId: ticket?.raffleId ?? null,
        raffleTitle: raffle?.title ?? "N/A",
        action: "DATOS_INCORRECTOS",
        processedAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al marcar datos incorrectos", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}
