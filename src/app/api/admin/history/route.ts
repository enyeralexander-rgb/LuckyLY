import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { getRevenueByRaffle, getPrizesPaidByRaffle } from "@/lib/accounting";
import type { Role } from "@/lib/db-types";

const ADMIN_ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ADMIN_ROLES);
    const { searchParams } = new URL(request.url);
    const day = searchParams.get("day");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    let executedAtGte: Date | undefined;
    let executedAtLte: Date | undefined;

    if (day && month && year) {
      const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
      executedAtGte = new Date(date.setHours(0, 0, 0, 0));
      executedAtLte = new Date(date.setHours(23, 59, 59, 999));
    } else if (month && year) {
      executedAtGte = new Date(`${year}-${month.padStart(2, "0")}-01`);
      executedAtLte = new Date(`${year}-${month.padStart(2, "0")}-31`);
    } else if (year) {
      executedAtGte = new Date(`${year}-01-01`);
      executedAtLte = new Date(`${year}-12-31`);
    }

    const raffles = await db.raffles.findManyHistory({
      executedAtGte,
      executedAtLte,
      type: type ?? undefined,
      take: 100,
    });

    const rafflesWithWinners = await Promise.all(
      raffles.map(async (r) => {
        const winningValues = r.winningItem
          ? r.winningItem.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        if (winningValues.length === 0) {
          return { ...r, winnerUsers: [] as { id: string; name: string; username: string | null }[] };
        }
        const items = await db.ticketItems.findMany({ raffleId: r.id });
        const winningSet = new Set(winningValues);
        const winningItems = items.filter((i) => winningSet.has(i.value));
        const ticketIds = [...new Set(winningItems.map((i) => i.ticketId))];
        const ticketList = await db.tickets.findManyByIds(ticketIds);
        const userIds = [...new Set(ticketList.map((t) => t.userId))];
        const winnerUsers: { id: string; name: string; username: string | null }[] = [];
        for (const uid of userIds) {
          const u = await db.users.findById(uid);
          if (u) winnerUsers.push({ id: u.id, name: u.name, username: u.username });
        }
        return { ...r, winnerUsers };
      })
    );

    const raffleIds = rafflesWithWinners.map((r) => r.id);
    const [revenueMap, prizesPaidMap, ticketCounts] = await Promise.all([
      getRevenueByRaffle(raffleIds),
      getPrizesPaidByRaffle(raffleIds),
      db.tickets.countByRaffle(raffleIds),
    ]);

    const result = rafflesWithWinners.map((r) => {
      const ingresos = revenueMap[r.id] ?? 0;
      const egresos = prizesPaidMap[r.id] ?? 0;
      return {
        ...r,
        contabilidad: {
          ingresos: Number(ingresos.toFixed(2)),
          egresos: Number(egresos.toFixed(2)),
          ganancias: Number((ingresos - egresos).toFixed(2)),
          ticketsVendidos: ticketCounts[r.id] ?? 0,
        },
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}
