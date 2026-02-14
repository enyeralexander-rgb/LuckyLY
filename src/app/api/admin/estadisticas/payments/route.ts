import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["CONTABLE", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const paymentMethod = searchParams.get("paymentMethod");
    const raffleId = searchParams.get("raffleId");
    const status = searchParams.get("status") || "CONFIRMED";
    const refSearch = searchParams.get("refSearch");
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    let purchasedAtGte: Date | undefined;
    let purchasedAtLte: Date | undefined;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      purchasedAtGte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      purchasedAtLte = end;
    }

    const statusFilter = status === "all" ? undefined : status;
    let ticketList: Awaited<ReturnType<typeof db.tickets.findMany>>;
    if (statusFilter && purchasedAtGte != null && purchasedAtLte != null) {
      ticketList = await db.tickets.findMany({
        where: { status: statusFilter, purchasedAtGte, purchasedAtLte, userId: userId ?? undefined, raffleId: raffleId ?? undefined },
        take: 10000,
      });
    } else if (statusFilter) {
      ticketList = await db.tickets.findMany({
        where: { status: statusFilter, userId: userId ?? undefined, raffleId: raffleId ?? undefined },
        take: 10000,
      });
    } else {
      ticketList = await db.tickets.findMany({
        where: { statusIn: ["CONFIRMED", "PENDING"], purchasedAtGte, purchasedAtLte, userId: userId ?? undefined, raffleId: raffleId ?? undefined },
        take: 10000,
      });
    }

    let filtered = ticketList;
    if (userId) filtered = filtered.filter((t) => t.userId === userId);
    if (raffleId) filtered = filtered.filter((t) => t.raffleId === raffleId);
    if (paymentMethod) {
      filtered = filtered.filter((t) => (t.paymentMethod ?? "") === paymentMethod);
    }
    if (refSearch) {
      const term = refSearch.toLowerCase();
      filtered = filtered.filter((t) => (t.paymentMobileRef ?? "").toLowerCase().includes(term));
    }

    const total = filtered.length;
    const totalSum = filtered.reduce((s, t) => s + Number(t.totalPaid), 0);
    const paginated = filtered.slice(skip, skip + limit);

    const userIds = [...new Set(paginated.map((t) => t.userId))];
    const raffleIds = [...new Set(paginated.map((t) => t.raffleId))];
    const [users, raffles] = await Promise.all([
      db.users.findManyByIds(userIds),
      Promise.all(raffleIds.map((id) => db.raffles.findById(id))),
    ]);
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));
    const raffleMap = Object.fromEntries(raffles.filter(Boolean).map((r) => [r!.id, r!]));

    const getTypeLabel = (type: string): string => {
      const labels: Record<string, string> = {
        NUMBERS: "Números",
        ANIMALS: "Animales",
        STATES: "Estados",
        FLAGS: "Banderas",
        ZODIAC: "Signos Zodiacales",
      };
      return labels[type] || type;
    };

    const payments = paginated.map((ticket) => {
      const items = Array.isArray(ticket.items) ? ticket.items : [];
      const user = userMap[ticket.userId];
      const raffle = raffleMap[ticket.raffleId];
      return {
        id: ticket.id,
        fecha: ticket.purchasedAt.toISOString(),
        nombreUsuario: user?.name ?? "-",
        emailUsuario: user?.email ?? "-",
        metodoPago: ticket.paymentMethod || "N/A",
        monto: Number(ticket.totalPaid),
        referenciaPago: ticket.paymentMobileRef || null,
        status: ticket.status,
        cuposComprados: items.join(", "),
        cantidadCupos: items.length,
        tituloSorteo: raffle?.title ?? "-",
        tipoSorteo: raffle ? getTypeLabel(raffle.type) : "-",
      };
    });

    return NextResponse.json({
      payments,
      totalSum: Number(totalSum.toFixed(2)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
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
