import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "7d";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    let dateStart: Date;
    let dateEnd: Date = new Date();

    // Calcular fechas según el período
    if (period === "custom" && startDate && endDate) {
      dateStart = new Date(startDate);
      dateEnd = new Date(endDate);
      dateEnd.setHours(23, 59, 59, 999);
    } else if (period === "24h") {
      dateStart = new Date();
      dateStart.setHours(dateStart.getHours() - 24);
    } else if (period === "7d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 7);
    } else if (period === "30d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 30);
    } else if (period === "90d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 90);
    } else if (period === "180d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 180);
    } else if (period === "365d") {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 365);
    } else if (period === "year") {
      dateStart = new Date(new Date().getFullYear(), 0, 1);
      dateEnd = new Date(new Date().getFullYear(), 11, 31, 23, 59, 59, 999);
    } else if (period === "all") {
      dateStart = new Date("2026-01-01");
    } else {
      dateStart = new Date();
      dateStart.setDate(dateStart.getDate() - 7);
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        tickets: {
          where: {
            status: "CONFIRMED",
            purchasedAt: {
              gte: dateStart,
              lte: dateEnd
            }
          },
          select: {
            totalPaid: true,
            purchasedAt: true,
            raffle: {
              select: {
                title: true,
                type: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.role !== "USER") {
      return NextResponse.json({ error: "El usuario no es un cliente" }, { status: 400 });
    }

    const totalSpent = user.tickets.reduce((sum, t) => sum + Number(t.totalPaid), 0);

    // Datos por día para el gráfico
    const purchasesByDay: Record<string, number> = {};
    user.tickets.forEach((ticket) => {
      const date = new Date(ticket.purchasedAt).toISOString().split("T")[0];
      purchasesByDay[date] = (purchasesByDay[date] || 0) + Number(ticket.totalPaid);
    });

    const chartData = Object.entries(purchasesByDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date,
        value: Number(value.toFixed(2))
      }));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        phoneNumber: user.phoneNumber,
        nationalId: user.nationalId,
        bank: user.bank,
        createdAt: user.createdAt.toISOString()
      },
      totalSpent: Number(totalSpent.toFixed(2)),
      purchaseCount: user.tickets.length,
      chartData,
      tickets: user.tickets.map(t => ({
        totalPaid: Number(t.totalPaid),
        purchasedAt: t.purchasedAt.toISOString(),
        raffleTitle: t.raffle.title,
        raffleType: t.raffle.type
      })),
      period: {
        start: dateStart.toISOString(),
        end: dateEnd.toISOString()
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener estadísticas de usuario:", err);
    return NextResponse.json({ error: "Error al obtener estadísticas de usuario" }, { status: 500 });
  }
}
