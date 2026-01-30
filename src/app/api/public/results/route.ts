import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET - Obtener resultados públicos de sorteos finalizados/ejecutados
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawLimit = Number(searchParams.get("limit") || "10");
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10;
    const approvedOnly = searchParams.get("approved") === "true";

    const where: any = {
      OR: [
        { executedAt: { not: null } },
        { status: "FINISHED" },
        { status: "EXECUTED" },
        { status: "COMPLETED" }
      ]
    };

    if (approvedOnly) {
      where.approved = true;
    }

    const results = await prisma.raffle.findMany({
      where,
      orderBy: [
        { executedAt: "desc" },
        { updatedAt: "desc" }
      ],
      take: limit,
      select: {
        id: true,
        title: true,
        type: true,
        status: true,
        approved: true,
        executedAt: true,
        winningItem: true,
        prizes: true,
        winnersCount: true
      }
    });

    const formattedResults = results.map((raffle) => ({
      id: raffle.id,
      title: raffle.title,
      type: raffle.type,
      status: raffle.status || "ACTIVE",
      approved: raffle.approved ?? false,
      executedAt: raffle.executedAt ? raffle.executedAt.toISOString() : null,
      winningItem: raffle.winningItem,
      prizes: Array.isArray(raffle.prizes) ? raffle.prizes : [],
      winnersCount: raffle.winnersCount
    }));

    return NextResponse.json(formattedResults);
  } catch (error) {
    console.error("Error al obtener resultados:", error);
    return NextResponse.json({ error: "Error al obtener resultados" }, { status: 500 });
  }
}
