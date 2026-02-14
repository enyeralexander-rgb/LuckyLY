import { NextResponse } from "next/server";
import { ticketItems, prizeClaims, raffles } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { withRetry } from "../../../../../lib/retry";
import type { Role } from "../../../../../lib/db-types";

const ADMIN_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ADMIN_ROLES);

    const [pendingSlots, pendingClaims, activeRaffles] = await withRetry(
      () =>
        Promise.all([
          ticketItems.count({ status: "PENDING" }),
          prizeClaims.count({ status: "REQUESTED" }),
          raffles.findMany({ where: { status: "ACTIVE" } })
        ]),
      { label: "notification stats" }
    );

    const raffleIds = activeRaffles.map((r) => r.id);
    const confirmedByRaffle = raffleIds.length > 0 ? await ticketItems.countByRaffle(raffleIds, "CONFIRMED") : {};
    const readyToExecute = activeRaffles.filter((raffle) => (confirmedByRaffle[raffle.id] ?? 0) === raffle.slots).length;

    return NextResponse.json({
      pendingSlots,
      pendingClaims,
      readyToExecute,
      total: pendingSlots + pendingClaims + readyToExecute
    });

  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err && typeof err === "object" && "message" in err && typeof (err as { message: string }).message === "string") {
      const msg = (err as { message: string }).message;
      if (msg.includes("No autenticado") || msg.includes("Token inválido") || msg.includes("Sin permisos") || msg.includes("No authorized") || msg.includes("Unauthorized")) {
        return NextResponse.json({ error: msg }, { status: (err as { status?: number }).status === 403 ? 403 : 401 });
      }
    }
    logger.error("Error fetching notification stats", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
