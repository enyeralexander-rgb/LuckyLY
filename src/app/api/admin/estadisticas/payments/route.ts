import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    
    // Filtros
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const paymentMethod = searchParams.get("paymentMethod");
    const raffleId = searchParams.get("raffleId");
    const status = searchParams.get("status") || "CONFIRMED"; // CONFIRMED, PENDING, or all
    const refSearch = searchParams.get("refSearch");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};
    // Status filter: default CONFIRMED for backward compat
    if (status && status !== "all") {
      where.status = status;
    } else if (status === "all") {
      where.status = { in: ["CONFIRMED", "PENDING"] };
    } else {
      where.status = "CONFIRMED";
    }

    // Filtro por fecha (mismo criterio que estadísticas: inicio/fin de día para alinear con purchasedAt)
    if (startDate || endDate) {
      where.purchasedAt = {};
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        where.purchasedAt.gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.purchasedAt.lte = end;
      }
    }

    // Filtro por usuario
    if (userId) {
      where.userId = userId;
    }

    // Filtro por método de pago
    if (paymentMethod) {
      where.paymentMethod = paymentMethod;
    }

    // Filtro por sorteo (nombre de dinámica)
    if (raffleId) {
      where.raffleId = raffleId;
    }

    // Filtro por referencia de pago
    if (refSearch) {
      where.paymentMobileRef = { contains: refSearch, mode: "insensitive" };
    }

    // Obtener tickets con información del usuario y sorteo + total acumulado
    const [tickets, total, totalSumAgg] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          raffle: {
            select: {
              id: true,
              title: true,
              type: true
            }
          }
        },
        orderBy: {
          purchasedAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.ticket.count({ where }),
      prisma.ticket.aggregate({
        where,
        _sum: { totalPaid: true }
      })
    ]);

    // Helper para obtener label del tipo de sorteo
    const getTypeLabel = (type: string): string => {
      const labels: Record<string, string> = {
        NUMBERS: "Números",
        ANIMALS: "Animales",
        STATES: "Estados",
        FLAGS: "Banderas",
        ZODIAC: "Signos Zodiacales"
      };
      return labels[type] || type;
    };

    // Formatear datos con información ampliada
    const payments = tickets.map(ticket => {
      const items = Array.isArray(ticket.items) ? ticket.items : [];
      return {
        id: ticket.id,
        fecha: ticket.purchasedAt.toISOString(),
        nombreUsuario: ticket.user.name,
        emailUsuario: ticket.user.email,
        metodoPago: ticket.paymentMethod || "N/A",
        monto: Number(ticket.totalPaid),
        referenciaPago: ticket.paymentMobileRef || null,
        status: ticket.status,
        cuposComprados: items.join(", "),
        cantidadCupos: items.length,
        tituloSorteo: ticket.raffle.title,
        tipoSorteo: getTypeLabel(ticket.raffle.type)
      };
    });

    return NextResponse.json({
      payments,
      totalSum: Number(totalSumAgg._sum.totalPaid ?? 0),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Error al obtener lista de pagos", { error: message });
    const isConnectionError = /connect|upstream|database|ECONNREFUSED|ETIMEDOUT/i.test(message);
    return NextResponse.json(
      { error: isConnectionError ? "No se pudo conectar a la base de datos. Reintenta en unos segundos." : "Error al obtener la lista de pagos." },
      { status: 500 }
    );
  }
}
