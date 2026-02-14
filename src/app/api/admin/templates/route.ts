import { NextResponse } from "next/server";
import * as db from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { parsePrizeValue } from "../../../../lib/validators";
import { newId } from "../../../../lib/id";
import type { Role, DrawType } from "../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const templates = await db.raffleTemplate.findMany();
    return NextResponse.json(templates);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener plantillas" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
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
      const currentPrizePool = values.reduce((a: number, b: number) => a + b, 0);
      if (Math.abs(currentPrizePool - requiredPrizePool) >= 0.1) {
        return NextResponse.json(
          { error: "El valor total de los premios debe ser exactamente el 70% del valor total del sorteo (Cupos * Precio)" },
          { status: 400 }
        );
      }
    }

    const id = newId();
    await db.raffleTemplate.create({
      id,
      name,
      description: description || null,
      type: type as DrawType,
      pricePerSlot: numPrice,
      slots: numSlots,
      winnersCount: parseInt(winnersCount || "1", 10),
      mirrorMode: mirrorMode === true,
      prizes: prizeList.length ? prizeList : undefined,
      createdById: auth.userId,
    });
    const template = await db.raffleTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 });
    }
    return NextResponse.json(template, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear plantilla" }, { status: 500 });
  }
}
