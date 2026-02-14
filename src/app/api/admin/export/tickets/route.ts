import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { exportTickets } from "@/lib/export";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const ticketList = await db.tickets.findMany({ take: 50000 });
    const raffleIds = [...new Set(ticketList.map((t) => t.raffleId))];
    const userIds = [...new Set(ticketList.map((t) => t.userId))];
    const [raffles, users] = await Promise.all([
      Promise.all(raffleIds.map((id) => db.raffles.findById(id))),
      db.users.findManyByIds(userIds),
    ]);
    const raffleMap = Object.fromEntries(raffles.filter(Boolean).map((r) => [r!.id, r!]));
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const tickets = ticketList.map((t) => ({
      ...t,
      raffle: raffleMap[t.raffleId] ? { id: raffleMap[t.raffleId].id, title: raffleMap[t.raffleId].title } : null,
      user: userMap[t.userId] ? { id: userMap[t.userId].id, name: userMap[t.userId].name } : null,
    }));

    const buffer = await exportTickets(tickets);
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="tickets_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al exportar tickets" }, { status: 500 });
  }
}
