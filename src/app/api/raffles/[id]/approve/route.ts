import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

// Aprobar un sorteo para que sea visible a los usuarios
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const raffleId = params.id;

    // Verificar que el sorteo existe
    const raffle = await prisma.raffle.findUnique({
      where: { id: raffleId }
    });

    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    if (raffle.approved) {
      return NextResponse.json({ error: "El sorteo ya está aprobado" }, { status: 400 });
    }

    // Aprobar el sorteo
    const updatedRaffle = await prisma.raffle.update({
      where: { id: raffleId },
      data: {
        approved: true,
        approvedAt: new Date(),
        approvedById: auth.userId
      }
    });

    // Registrar en audit log
    try {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "RAFFLE_APPROVED",
          entity: "Raffle",
          entityId: raffleId,
          ip,
          meta: {
            raffleTitle: raffle.title,
            raffleType: raffle.type
          }
        }
      });
    } catch (logError) {
      console.error("Error al registrar audit log:", logError);
    }

    return NextResponse.json({
      success: true,
      message: "Sorteo aprobado exitosamente",
      raffle: updatedRaffle
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al aprobar sorteo:", err);
    return NextResponse.json({ error: "Error al aprobar sorteo" }, { status: 500 });
  }
}
