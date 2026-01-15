import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 20;
    const skip = (page - 1) * limit;

    const [tickets, total] = await Promise.all([
      prisma.ticket.findMany({
        where: { userId: auth.userId },
        include: {
          raffle: {
            select: {
              id: true,
              title: true,
              type: true,
              winningItem: true,
              executedAt: true,
            },
          },
          prizeClaim: {
            select: {
              id: true,
              status: true,
              processedAt: true,
            },
          },
        },
        orderBy: { purchasedAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.ticket.count({
        where: { userId: auth.userId },
      }),
    ]);

    const payments = tickets.map((ticket) => ({
      id: ticket.id,
      raffle: ticket.raffle,
      items: Array.isArray(ticket.items) ? ticket.items : [],
      totalPaid: Number(ticket.totalPaid),
      paymentMethod: ticket.paymentMethod,
      paymentMobileRef: ticket.paymentMobileRef,
      status: ticket.status,
      purchasedAt: ticket.purchasedAt,
      isWinner: ticket.status === "WIN",
      prizeClaim: ticket.prizeClaim,
    }));

    return NextResponse.json({
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener historial de pagos" }, { status: 500 });
  }
}
