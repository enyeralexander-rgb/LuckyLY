import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
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

// Actualizar plantilla
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    
    const { name, description, type, pricePerSlot, slots, winnersCount, mirrorMode, prizes } = body;

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
