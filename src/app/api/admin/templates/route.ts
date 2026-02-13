import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { parsePrizeValue } from "../../../../lib/validators";
import { Role, DrawType } from "@prisma/client";

// Obtener todas las plantillas
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    const templates = await prisma.raffleTemplate.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(templates);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 });
  }
}

// Crear nueva plantilla (misma regla del 70% que Crear Sorteo)
export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    
    const { name, description, type, pricePerSlot, slots, winnersCount, mirrorMode, prizes } = body;

    if (!name || !type || !pricePerSlot || !slots) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
    }

    const numSlots = parseInt(slots, 10);
    const numPrice = parseFloat(pricePerSlot);
    const prizeList = Array.isArray(prizes) ? prizes : [];

    if (prizeList.length > 0) {
      const values = prizeList.map((p: string) => parsePrizeValue(p));
      for (let i = 0; i < values.length - 1; i++) {
        if (values[i] < values[i + 1]) {
          return NextResponse.json(
            { error: "Los premios deben estar ordenados de mayor a menor (1° >= 2° >= 3°...)" },
            { status: 400 }
          );
        }
      }
      const totalIncome = numSlots * numPrice;
      const requiredPrizePool = totalIncome * 0.7;
      const currentPrizePool = values.reduce((a, b) => a + b, 0);
      if (Math.abs(currentPrizePool - requiredPrizePool) >= 0.1) {
        return NextResponse.json(
          {
            error:
              "El valor total de los premios debe ser exactamente el 70% del valor total del sorteo (Cupos * Precio)",
          },
          { status: 400 }
        );
      }
    }

    const template = await prisma.raffleTemplate.create({
      data: {
        name,
        description: description || null,
        type: type as DrawType,
        pricePerSlot: parseFloat(pricePerSlot),
        slots: parseInt(slots),
        winnersCount: parseInt(winnersCount || "1"),
        mirrorMode: mirrorMode === true,
        prizes: prizes || null,
        createdById: auth.userId,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 });
  }
}
