import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Usar requireAuth que es la función exportada en lib/auth
    let auth;
    try {
      auth = requireAuth(req, ["SUPERADMIN", "MASTER"]);
    } catch (err) {
      if (err instanceof AuthError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { suspended, reason } = body;

    if (typeof suspended !== "boolean") {
      return NextResponse.json(
        { error: "El campo 'suspended' debe ser un booleano" },
        { status: 400 }
      );
    }

    // Verificar que el usuario exista
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, email: true, name: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // No permitir suspender usuarios con roles iguales o superiores
    const roleHierarchy: Record<string, number> = {
      USER: 1,
      AGENT: 2,
      CONTABLE: 2,
      SUPERADMIN: 3,
      MASTER: 4
    };

    if (roleHierarchy[user.role] >= roleHierarchy[auth.role]) {
      return NextResponse.json(
        { error: "No puedes suspender a un usuario con el mismo rol o superior" },
        { status: 403 }
      );
    }

    // No permitir suspenderse a sí mismo
    if (user.id === auth.userId) {
      return NextResponse.json(
        { error: "No puedes suspenderte a ti mismo" },
        { status: 400 }
      );
    }

    // Actualizar el estado de suspensión
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        suspended,
        suspendedReason: suspended ? (reason || "Sin motivo especificado") : null,
        suspendedAt: suspended ? new Date() : null
      },
      select: {
        id: true,
        email: true,
        name: true,
        suspended: true,
        suspendedReason: true,
        suspendedAt: true
      }
    });

    // Registrar en el log de auditoría
    await prisma.auditLog.create({
      data: {
        action: suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
        entity: "User",
        entityId: id,
        meta: {
          targetUser: user.email,
          targetName: user.name,
          reason: suspended ? (reason || "Sin motivo especificado") : "Usuario reactivado"
        },
        actorId: auth.userId,
        actorRole: auth.role
      }
    });

    return NextResponse.json({
      success: true,
      message: suspended 
        ? `Usuario ${user.email} suspendido exitosamente` 
        : `Usuario ${user.email} reactivado exitosamente`,
      user: updatedUser
    });
  } catch (error) {
    console.error("Error al suspender/reactivar usuario:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
