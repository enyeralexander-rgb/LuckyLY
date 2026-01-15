import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

// Crear sorteo desde plantilla
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    
    const { title, description, startsAt, closesAt, autoExecute } = body;

    const template = await prisma.raffleTemplate.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    if (!title) {
      return NextResponse.json({ error: "El título es requerido" }, { status: 400 });
    }

    const raffle = await prisma.raffle.create({
      data: {
        title,
        description: description || template.description || null,
        type: template.type,
        pricePerSlot: template.pricePerSlot,
        slots: template.slots,
        winnersCount: template.winnersCount,
        mirrorMode: template.mirrorMode,
        prizes: template.prizes || undefined,
        status: "ACTIVE",
        startsAt: startsAt ? new Date(startsAt) : null,
        closesAt: closesAt ? new Date(closesAt) : null,
        autoExecute: autoExecute === true,
        templateId: template.id,
        createdById: auth.userId,
      },
    });

    return NextResponse.json(raffle, { status: 201 });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al crear sorteo desde plantilla:", err);
    return NextResponse.json({ error: "Error al crear sorteo desde plantilla" }, { status: 500 });
  }
}
