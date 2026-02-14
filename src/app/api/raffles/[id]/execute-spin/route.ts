import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(request, ROLES);
    const { id } = await params;
    const { blockedItems = [], spinNumber } = await request.json().catch(() => ({}));

    const raffle = await db.raffles.findById(id);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    const allItems = await db.ticketItems.findMany({ raffleId: id });
    const availableItems = allItems
      .filter((t) => t.status === "CONFIRMED")
      .map((t) => t.value)
      .filter((value: string) => !(blockedItems as string[]).includes(value));

    if (availableItems.length === 0) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 });
    }

    const randomIndex = Math.floor(Math.random() * availableItems.length);
    const winner = availableItems[randomIndex];

    return NextResponse.json({ winner, spinNumber });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al ejecutar giro" }, { status: 500 });
  }
}
