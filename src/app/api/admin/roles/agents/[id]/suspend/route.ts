import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const agent = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true }
    });

    if (!agent || agent.role !== Role.AGENT) {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    await prisma.user.update({
      where: { id: params.id },
      data: { role: "USER" }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "SUSPEND_AGENT",
        entity: "User",
        entityId: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al suspender agente" }, { status: 500 });
  }
}

