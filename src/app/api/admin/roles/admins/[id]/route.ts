import { NextResponse } from "next/server";
import * as db from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import bcrypt from "bcryptjs";
import { newId } from "../../../../../../lib/id";
import type { Role } from "../../../../../../lib/db-types";

const ADMIN_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const body = await request.json();
    const { name, email, username, role, password } = body;

    const admin = await db.users.findById(params.id);
    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }
    if (!ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }

    const updateData: Partial<Parameters<typeof db.users.update>[1]> = {};
    if (name) updateData.name = name;
    if (email && email !== admin.email) {
      const existing = await db.users.findByEmail(email);
      if (existing) {
        return NextResponse.json({ error: "Email ya está en uso" }, { status: 400 });
      }
      updateData.email = email;
    }
    if (username !== undefined) {
      if (username && String(username).trim()) {
        const cleanUsername = String(username).toLowerCase().trim();
        if (cleanUsername !== admin.username) {
          const existing = await db.users.findByUsername(cleanUsername);
          if (existing) {
            return NextResponse.json({ error: "Nombre de usuario ya está en uso" }, { status: 400 });
          }
          updateData.username = cleanUsername;
        }
      } else {
        updateData.username = null;
      }
    }
    if (role && role !== admin.role) {
      if (!ADMIN_ROLES.includes(role as Role)) {
        return NextResponse.json({ error: "Rol inválido o no permitido" }, { status: 400 });
      }
      updateData.role = role as Role;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(admin);
    }

    await db.users.update(params.id, updateData);
    const updated = await db.users.findById(params.id);
    if (!updated) {
      return NextResponse.json({ error: "Error al actualizar" }, { status: 500 });
    }

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "UPDATE_ADMIN",
      entity: "User",
      entityId: updated.id,
      meta: { previousRole: admin.role, newRole: updated.role, changes: Object.keys(updateData) },
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      username: updated.username,
      role: updated.role,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar administrador" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const admin = await db.users.findById(params.id);
    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }
    if (!ADMIN_ROLES.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }
    if (admin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    await db.users.deleteById(params.id);

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "DELETE_ADMIN",
      entity: "User",
      entityId: params.id,
      meta: { deletedEmail: admin.email, deletedName: admin.name, deletedRole: admin.role },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al eliminar administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al eliminar administrador" }, { status: 500 });
  }
}
