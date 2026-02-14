import { NextRequest, NextResponse } from "next/server";
import { raffles } from "../../../../lib/db";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";
import { logger } from "../../../../lib/logger";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const rawLimit = Number(searchParams.get("limit") || "10");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
    const approvedOnly = searchParams.get("approved") === "true";

    const results = await raffles.findManyPublicResults({ take: limit, approvedOnly });

    const formattedResults = results.map((raffle) => ({
      id: raffle.id,
      title: raffle.title,
      type: raffle.type,
      status: raffle.status || "ACTIVE",
      approved: raffle.approved ?? false,
      executedAt: raffle.executedAt ? (raffle.executedAt instanceof Date ? raffle.executedAt.toISOString() : String(raffle.executedAt)) : null,
      winningItem: raffle.winningItem,
      prizes: Array.isArray(raffle.prizes) ? raffle.prizes : [],
      winnersCount: raffle.winnersCount,
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      logger.info("[Public Results API] DB no disponible, devolviendo vacío");
      return NextResponse.json([], { status: 200, headers: { "x-fallback": "db-unavailable" } });
    }
    logger.error("Error al obtener resultados", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al obtener resultados" }, { status: 500 });
  }
}
