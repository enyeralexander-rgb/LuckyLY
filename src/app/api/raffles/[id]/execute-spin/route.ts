import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const { blockedItems = [], spinNumber } = await request.json();

    const raffle = await prisma.raffle.findUnique({
      where: { id: params.id },
      include: { ticketItems: true }
    });

    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    // Filtrar items disponibles (excluir bloqueados y solo usar confirmados)
    const availableItems = raffle.ticketItems
      .filter((t) => t.status === "CONFIRMED")
      .map((t) => t.value)
      .filter((value) => !blockedItems.includes(value));

    if (availableItems.length === 0) {
      return NextResponse.json({ error: "No hay cupos disponibles" }, { status: 400 });
    }

    // Seleccionar ganador aleatorio de los disponibles
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

