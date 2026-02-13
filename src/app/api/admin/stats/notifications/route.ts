import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { withRetry } from "../../../../../lib/retry";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    // Solo roles administrativos pueden ver estas estadísticas
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);

    const [pendingSlots, pendingClaims, activeRaffles] = await withRetry(
      () =>
        Promise.all([
          // 1. Cupos pendientes de confirmación (pago móvil)
          prisma.ticketItem.count({
            where: {
              status: "PENDING"
            }
          }),

          // 2. Reclamos de premios pendientes
          prisma.prizeClaim.count({
            where: {
              status: "REQUESTED"
            }
          }),

          // 3. Obtener sorteos activos para calcular cuáles están listos
          prisma.raffle.findMany({
            where: {
              status: "ACTIVE"
            },
            include: {
              ticketItems: {
                where: {
                  status: "CONFIRMED"
                },
                select: {
                  id: true
                }
              }
            }
          })
        ]),
      { label: "notification stats" }
    );

    // Calcular sorteos listos para ejecutar (todos los cupos confirmados)
    const readyToExecute = activeRaffles.filter(
      (raffle) => raffle.ticketItems.length === raffle.slots
    ).length;

    return NextResponse.json({
      pendingSlots,
      pendingClaims,
      readyToExecute,
      total: pendingSlots + pendingClaims + readyToExecute
    });

  } catch (err: any) {
    if (err.message && (err.message.includes("No authorized") || err.message.includes("Unauthorized"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    logger.error("Error fetching notification stats", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
