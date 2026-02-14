import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { parsePrizeValue } from "../../../../../lib/validators";
import { logger } from "../../../../../lib/logger";
import type { Role, DrawType } from "../../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request, ROLES);
    const template = await db.raffleTemplate.findById(params.id);
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener plantilla" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request, ROLES);
    const body = await request.json();
    const { name, description, type, pricePerSlot, slots, winnersCount, mirrorMode, prizes } = body;

    const existing = await db.raffleTemplate.findById(params.id);
    if (!existing) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const prizeList = Array.isArray(prizes) ? prizes : [];
    if (prizeList.length > 0) {
      const numSlots = slots != null ? parseInt(slots, 10) : existing.slots;
      const numPrice = pricePerSlot != null ? parseFloat(pricePerSlot) : Number(existing.pricePerSlot);
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

    const updateData: Parameters<typeof db.raffleTemplate.update>[1] = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (type) updateData.type = type as DrawType;
    if (pricePerSlot != null) updateData.pricePerSlot = parseFloat(pricePerSlot);
    if (slots != null) updateData.slots = parseInt(slots, 10);
    if (winnersCount != null) updateData.winnersCount = parseInt(winnersCount, 10);
    if (mirrorMode !== undefined) updateData.mirrorMode = mirrorMode;
    if (prizes !== undefined) updateData.prizes = prizes;

    const template = await db.raffleTemplate.update(params.id, updateData);
    return NextResponse.json(template);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar plantilla", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    requireAuth(request, ROLES);
    const template = await db.raffleTemplate.findById(params.id);
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }
    await db.raffleTemplate.deleteById(params.id);
    return NextResponse.json({ success: true, message: "Plantilla eliminada" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 });
  }
}
