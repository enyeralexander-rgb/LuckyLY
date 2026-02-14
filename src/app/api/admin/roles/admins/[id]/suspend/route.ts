import { NextResponse } from "next/server";
import * as db from "../../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../../lib/auth";
import { logger } from "../../../../../../../lib/logger";
import { newId } from "../../../../../../../lib/id";
import type { Role } from "../../../../../../../lib/db-types";

const ADMIN_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const admin = await db.users.findById(params.id);
    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }
    if (!ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }
    if (admin.role === "MASTER") {
      return NextResponse.json({ error: "No se pueden suspender administradores MASTER" }, { status: 403 });
    }
    if (admin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes suspender tu propia cuenta" }, { status: 400 });
    }

    const isSuspended = admin.suspended;
    await db.users.update(params.id, { suspended: !isSuspended });

    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: isSuspended ? "REACTIVATE_ADMIN" : "SUSPEND_ADMIN",
      entity: "User",
      entityId: params.id,
      ip,
      meta: { adminEmail: admin.email, adminName: admin.name, adminRole: admin.role, action: isSuspended ? "REACTIVADO" : "SUSPENDIDO" },
    });

    return NextResponse.json({
      success: true,
      suspended: !isSuspended,
      message: isSuspended ? "Administrador reactivado" : "Administrador suspendido",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al suspender/reactivar administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al suspender/reactivar administrador" }, { status: 500 });
  }
}
