import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
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

// Crear nueva plantilla
export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    
    const { name, description, type, pricePerSlot, slots, winnersCount, mirrorMode, prizes } = body;

    if (!name || !type || !pricePerSlot || !slots) {
      return NextResponse.json({ error: "Campos requeridos faltantes" }, { status: 400 });
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
