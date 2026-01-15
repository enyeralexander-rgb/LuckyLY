import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

// Eliminar link de referido
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);

    const link = await prisma.referralLink.findUnique({
      where: { id: params.id }
    });

    if (!link) {
      return NextResponse.json({ error: "Link de referido no encontrado" }, { status: 404 });
    }

    await prisma.referralLink.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "DELETE_REFERRAL_LINK",
        entity: "ReferralLink",
        entityId: params.id,
        meta: { code: link.code, name: link.name }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al eliminar link de referido:", err);
    return NextResponse.json({ error: "Error al eliminar link de referido" }, { status: 500 });
  }
}
