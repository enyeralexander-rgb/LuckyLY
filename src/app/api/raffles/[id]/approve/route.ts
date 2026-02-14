import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { newId } from "@/lib/id";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id: raffleId } = await params;

    const raffle = await db.raffles.findById(raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }
    if (raffle.approved) {
      return NextResponse.json({ error: "El sorteo ya está aprobado" }, { status: 400 });
    }

    await db.raffles.update(raffleId, {
      approved: true,
      approvedAt: new Date(),
      approvedById: auth.userId,
    });
    const updatedRaffle = await db.raffles.findById(raffleId);

    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await db.auditLog.create({
        id: newId(),
        actorId: auth.userId,
        actorRole: auth.role,
        action: "RAFFLE_APPROVED",
        entity: "Raffle",
        entityId: raffleId,
        ip,
        meta: { raffleTitle: raffle.title, raffleType: raffle.type },
      });
    } catch (logError) {
      logger.error("Error al registrar audit log", { error: logError instanceof Error ? logError.message : String(logError) });
    }

    return NextResponse.json({
      success: true,
      message: "Sorteo aprobado exitosamente",
      raffle: updatedRaffle,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al aprobar sorteo", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al aprobar sorteo" }, { status: 500 });
  }
}
