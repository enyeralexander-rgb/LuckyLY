import { NextRequest, NextResponse } from "next/server";
import { users, auditLog } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Role } from "@/lib/db-types";
import { newId } from "@/lib/id";

const ADMIN_ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req, ADMIN_ROLES);
    const { id } = await params;
    const body = await req.json();
    const { suspended, reason } = body;

    if (typeof suspended !== "boolean") {
      return NextResponse.json(
        { error: "El campo 'suspended' debe ser un booleano" },
        { status: 400 }
      );
    }

    const user = await users.findById(id);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const roleHierarchy: Record<string, number> = {
      USER: 1,
      AGENT: 2,
      CONTABLE: 2,
      SUPERADMIN: 3,
      MASTER: 4,
    };

    if (roleHierarchy[user.role] >= roleHierarchy[auth.role]) {
      return NextResponse.json(
        { error: "No puedes suspender a un usuario con el mismo rol o superior" },
        { status: 403 }
      );
    }

    if (user.id === auth.userId) {
      return NextResponse.json(
        { error: "No puedes suspenderte a ti mismo" },
        { status: 400 }
      );
    }

    await users.update(id, {
      suspended,
      suspendedReason: suspended ? (reason || "Sin motivo especificado") : null,
      suspendedAt: suspended ? new Date() : null,
    });

    await auditLog.create({
      id: newId(),
      action: suspended ? "SUSPEND_USER" : "UNSUSPEND_USER",
      entity: "User",
      entityId: id,
      meta: {
        targetUser: user.email,
        targetName: user.name,
        reason: suspended ? (reason || "Sin motivo especificado") : "Usuario reactivado",
      },
      actorId: auth.userId,
      actorRole: auth.role,
    });

    const updatedUser = await users.findById(id);

    return NextResponse.json({
      success: true,
      message: suspended
        ? `Usuario ${user.email} suspendido exitosamente`
        : `Usuario ${user.email} reactivado exitosamente`,
      user: updatedUser
        ? {
            id: updatedUser.id,
            email: updatedUser.email,
            name: updatedUser.name,
            suspended: updatedUser.suspended,
            suspendedReason: updatedUser.suspendedReason,
            suspendedAt: updatedUser.suspendedAt,
          }
        : null,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al suspender/reactivar usuario", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
