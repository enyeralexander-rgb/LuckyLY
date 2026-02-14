import { NextResponse } from "next/server";
import { tickets, ticketItems } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import type { Role } from "@/lib/db-types";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["USER"] as Role[]);
    const raffleId = params.id;

    const userTickets = await tickets.findMany({
      where: {
        raffleId,
        userId: auth.userId,
        statusIn: ["CONFIRMED", "PENDING"],
      },
    });

    const ticketIds = userTickets.map((t) => t.id);
    if (ticketIds.length === 0) {
      return NextResponse.json({ count: 0 });
    }

    const allItems = await ticketItems.findMany({ raffleId });
    const validStatuses = new Set(["CONFIRMED", "PENDING"]);
    const ticketIdSet = new Set(ticketIds);
    const totalSlots = allItems.filter(
      (i) => ticketIdSet.has(i.ticketId) && validStatuses.has(i.status)
    ).length;

    return NextResponse.json({ count: totalSlots });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener cupos del usuario" }, { status: 500 });
  }
}
