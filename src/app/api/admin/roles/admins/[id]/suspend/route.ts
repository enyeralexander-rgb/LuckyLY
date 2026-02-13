import { NextResponse } from "next/server";
import { prisma } from "../../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../../lib/auth";
import { logger } from "../../../../../../../lib/logger";
import { Role } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    
    const admin = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }

    // Verificar que sea un administrador
    const adminRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (!adminRoles.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }

    // No permitir suspender MASTER
    if (admin.role === Role.MASTER) {
      return NextResponse.json({ error: "No se pueden suspender administradores MASTER" }, { status: 403 });
    }

    // No permitir auto-suspensión
    if (admin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
    }

    const isSuspended = admin.suspended;
    
    await prisma.user.update({
      where: { id: params.id },
      data: { suspended: !isSuspended }
    });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: isSuspended ? "REACTIVATE_ADMIN" : "SUSPEND_ADMIN",
        entity: "User",
        entityId: params.id,
        ip,
        meta: {
          adminEmail: admin.email,
          adminName: admin.name,
          adminRole: admin.role,
          action: isSuspended ? "REACTIVADO" : "SUSPENDIDO"
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      suspended: !isSuspended,
      message: isSuspended ? "Administrador reactivado" : "Administrador suspendido"
    });
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al suspender/reactivar administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al suspender/reactivar administrador" }, { status: 500 });
  }
}
