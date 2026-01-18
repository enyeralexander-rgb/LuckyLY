import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

// GET - Obtener los últimos 10 resultados de sorteos finalizados (público)
export async function GET() {
  try {
    const results = await prisma.raffle.findMany({
      where: {
        status: "FINISHED",
        executedAt: { not: null },
        winningItem: { not: null }
      },
      orderBy: { executedAt: "desc" },
      take: 10,
      select: {
        id: true,
        title: true,
        type: true,
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
