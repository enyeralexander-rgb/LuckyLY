import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { parsePrizeValue } from "../../../../../lib/validators";
import { Role, DrawType } from "@prisma/client";

// Obtener plantilla específica
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    const template = await prisma.raffleTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener plantilla" }, { status: 500 });
  }
}

// Actualizar plantilla (misma regla del 70% que Crear Sorteo)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    
    const { name, description, type, pricePerSlot, slots, winnersCount, mirrorMode, prizes } = body;

    const existing = await prisma.raffleTemplate.findUnique({
      where: { id: params.id },
    });
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

    const template = await prisma.raffleTemplate.update({
      where: { id: params.id },
      data: {
        name,
        description: description !== undefined ? description : undefined,
        type: type ? (type as DrawType) : undefined,
        pricePerSlot: pricePerSlot ? parseFloat(pricePerSlot) : undefined,
        slots: slots ? parseInt(slots) : undefined,
        winnersCount: winnersCount ? parseInt(winnersCount) : undefined,
        mirrorMode: mirrorMode !== undefined ? mirrorMode : undefined,
        prizes: prizes !== undefined ? prizes : undefined,
      },
    });

    return NextResponse.json(template);
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar plantilla:", err);
    return NextResponse.json({ error: "Error al actualizar plantilla" }, { status: 500 });
  }
}

// Eliminar plantilla
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    await prisma.raffleTemplate.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true, message: "Plantilla eliminada" });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al eliminar plantilla" }, { status: 500 });
  }
}
