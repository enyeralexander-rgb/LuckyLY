import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

// Obtener favoritos del usuario
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    
    const favorites = await prisma.favoriteRaffle.findMany({
      where: { userId: auth.userId },
      include: {
        raffle: {
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            pricePerSlot: true,
            slots: true,
            winnersCount: true,
            status: true,
            startsAt: true,
            closesAt: true,
            prizes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(favorites);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener favoritos" }, { status: 500 });
  }
}

// Agregar/quitar favorito
export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const { raffleId } = await request.json();

    if (!raffleId) {
      return NextResponse.json({ error: "raffleId es requerido" }, { status: 400 });
    }

    // Verificar que el sorteo existe
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId },
    });

    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    // Verificar si ya es favorito
    const existing = await prisma.favoriteRaffle.findUnique({
      where: {
        userId_raffleId: {
          userId: auth.userId,
          raffleId,
        },
      },
    });

    if (existing) {
      // Eliminar favorito
      await prisma.favoriteRaffle.delete({
        where: { id: existing.id },
      });
      return NextResponse.json({ isFavorite: false, message: "Sorteo eliminado de favoritos" });
    } else {
      // Agregar favorito
      await prisma.favoriteRaffle.create({
        data: {
          userId: auth.userId,
          raffleId,
        },
      });
      return NextResponse.json({ isFavorite: true, message: "Sorteo agregado a favoritos" });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al modificar favorito" }, { status: 500 });
  }
}
