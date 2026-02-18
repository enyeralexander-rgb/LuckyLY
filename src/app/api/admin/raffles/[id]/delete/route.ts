import { NextResponse } from "next/server";
import { raffles, ticketItems, auditLog } from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import type { Role } from "../../../../../../lib/db-types";
import { newId } from "../../../../../../lib/id";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id: raffleId } = await params;

    const raffle = await raffles.findById(raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    if (raffle.status !== "ACTIVE") {
      return NextResponse.json({ error: "Solo se pueden eliminar sorteos activos" }, { status: 400 });
    }

    // Check for purchased or reserved cupos
    const items = await ticketItems.findMany({ raffleId });
    const hasConfirmed = items.some((i) => i.status === "CONFIRMED");
    const hasPending = items.some((i) => i.status === "PENDING");

    if (hasConfirmed || hasPending) {
      return NextResponse.json(
        { error: "No se puede eliminar: hay cupos comprados o reservados" },
        { status: 400 }
      );
    }

    // Safe to delete
    await raffles.deleteById(raffleId);

    // Audit log
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "DELETE_RAFFLE",
      entity: "Raffle",
      entityId: raffleId,
      ip,
      meta: {
        raffleTitle: raffle.title,
        raffleType: raffle.type,
        slots: raffle.slots,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al eliminar sorteo" }, { status: 500 });
  }
}
