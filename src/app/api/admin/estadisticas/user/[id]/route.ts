import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import * as db from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import { parsePeriodRange } from "../../../../../../lib/dateRange";
import type { Role } from "../../../../../../lib/db-types";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(request, ["MASTER"] as Role[]);
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const { dateStart, dateEnd } = parsePeriodRange(period, startDate ?? undefined, endDate ?? undefined);

    const user = await db.users.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }
    if (user.role !== "USER") {
      return NextResponse.json({ error: "El usuario no es un cliente" }, { status: 400 });
    }

    const allTickets = await db.tickets.findMany({
      where: { userId: user.id, status: "CONFIRMED" },
      take: 10000,
    });
    const ticketsInRange = allTickets.filter(
      (t) => new Date(t.purchasedAt) >= dateStart && new Date(t.purchasedAt) <= dateEnd
    );

    const raffleIds = [...new Set(ticketsInRange.map((t) => t.raffleId))];
    const raffles = await Promise.all(raffleIds.map((id) => db.raffles.findById(id)));
    const raffleMap = Object.fromEntries(raffles.filter(Boolean).map((r) => [r!.id, r!]));

    const totalSpent = ticketsInRange.reduce((sum, t) => sum + Number(t.totalPaid), 0);
    const purchasesByDay: Record<string, number> = {};
    ticketsInRange.forEach((ticket) => {
      const date = new Date(ticket.purchasedAt).toISOString().split("T")[0];
      purchasesByDay[date] = (purchasesByDay[date] || 0) + Number(ticket.totalPaid);
    });
    const chartData = Object.entries(purchasesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value: Number(value.toFixed(2)) }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        documentId: user.documentId,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId,
        nationalIdType: user.nationalIdType,
        bank: user.bank,
        createdAt: new Date(user.createdAt).toISOString(),
      },
      totalSpent: Number(totalSpent.toFixed(2)),
      purchaseCount: ticketsInRange.length,
      chartData,
      tickets: ticketsInRange.map((t) => ({
        totalPaid: Number(t.totalPaid),
        purchasedAt: new Date(t.purchasedAt).toISOString(),
        raffleTitle: raffleMap[t.raffleId]?.title ?? "-",
        raffleType: raffleMap[t.raffleId]?.type ?? "-",
      })),
      period: { start: dateStart.toISOString(), end: dateEnd.toISOString() },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener estadísticas de usuario", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener estadísticas de usuario" }, { status: 500 });
  }
}
