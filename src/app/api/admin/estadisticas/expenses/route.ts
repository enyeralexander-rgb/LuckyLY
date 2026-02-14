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
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const userId = searchParams.get("userId");
    const raffleId = searchParams.get("raffleId");
    const paymentRef = searchParams.get("paymentRef");

    let processedAtGte: Date | undefined;
    let processedAtLte: Date | undefined;
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      processedAtGte = start;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      processedAtLte = end;
    }

    const claims = await db.prizeClaims.findMany({
      where: { status: "PAID", processedAtGte, processedAtLte },
      take: 10000,
    });

    let filtered = claims;
    if (userId) filtered = filtered.filter((c) => c.userId === userId);
    if (raffleId || paymentRef) {
      const ticketIds = [...new Set(claims.map((c) => c.ticketId))];
      const ticketList = await db.tickets.findManyByIds(ticketIds);
      const ticketMap = Object.fromEntries(ticketList.map((t) => [t.id, t]));
      if (raffleId) filtered = filtered.filter((c) => ticketMap[c.ticketId]?.raffleId === raffleId);
      if (paymentRef) {
        const term = paymentRef.toLowerCase();
        filtered = filtered.filter((c) => (c.paymentRef ?? "").toLowerCase().includes(term));
      }
    }

    const total = filtered.length;
    const totalSum = filtered.reduce((s, c) => s + Number(c.paidAmount ?? 0), 0);
    const paginated = filtered.slice(skip, skip + limit);

    const ticketIds = [...new Set(paginated.map((c) => c.ticketId))];
    const [ticketList, userList] = await Promise.all([
      db.tickets.findManyByIds(ticketIds),
      db.users.findManyByIds([...new Set(paginated.map((c) => c.userId))]),
    ]);
    const raffleIds = [...new Set(ticketList.map((t) => t.raffleId))];
    const raffles = await Promise.all(raffleIds.map((id) => db.raffles.findById(id)));
    const ticketMap = Object.fromEntries(ticketList.map((t) => [t.id, t]));
    const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));
    const raffleMap = Object.fromEntries(raffles.filter(Boolean).map((r) => [r!.id, r!]));

    const expenses = paginated.map((claim) => {
      const ticket = ticketMap[claim.ticketId];
      const raffle = ticket ? raffleMap[ticket.raffleId] : null;
      const user = userMap[claim.userId];
      let amount = Number(claim.paidAmount ?? 0);
      if (claim.paidAmount == null && raffle?.prizes) {
        amount = estimatePrize(raffle.winningItem, raffle.prizes, ticket?.items);
      }
      return {
        id: claim.id,
        fecha: claim.processedAt?.toISOString() || "",
        nombreGanador: user?.name ?? "-",
        emailGanador: user?.email ?? "-",
        tituloSorteo: raffle?.title ?? "N/A",
        tipoSorteo: raffle?.type ?? "N/A",
        referenciaPago: claim.paymentRef || null,
        montoPagado: amount,
        montoCompra: ticket ? Number(ticket.totalPaid) : 0,
        sorteoId: raffle?.id ?? "",
      };
    });

    return NextResponse.json({
      expenses,
      totalSum: Number(totalSum.toFixed(2)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener lista de egresos", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener la lista de egresos" }, { status: 500 });
  }
}

function estimatePrize(winningItem: string | null, prizes: unknown, ticketItems: unknown): number {
  if (!winningItem || !prizes || !Array.isArray(prizes) || prizes.length === 0) return 0;
  const winners = winningItem.split(",").map((s) => s.trim()).filter(Boolean);
  const items = Array.isArray(ticketItems) ? (ticketItems as unknown[]).filter((x): x is string => typeof x === "string") : [];
  let winnerIndex = -1;
  for (const item of items) {
    const idx = winners.indexOf(item);
    if (idx !== -1 && (winnerIndex === -1 || idx < winnerIndex)) winnerIndex = idx;
  }
  if (winnerIndex < 0 || winnerIndex >= prizes.length) return 0;
  const raw = prizes[winnerIndex];
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const match = raw.trim().match(/(\d+(?:[.,]\d+)?)/);
    return match ? parseFloat(match[1].replace(",", ".")) || 0 : parseFloat(raw) || 0;
  }
  return 0;
}
