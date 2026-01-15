import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const superadmin = await prisma.user.findUnique({
      where: { id: params.id },
      select: { role: true, id: true }
    });

    if (!superadmin || superadmin.role !== Role.SUPERADMIN) {
      return NextResponse.json({ error: "Superadmin no encontrado" }, { status: 404 });
    }

    if (superadmin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes borrarte a ti mismo" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "DELETE_SUPERADMIN",
        entity: "User",
        entityId: params.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al borrar superadmin" }, { status: 500 });
  }
}

