import { NextResponse } from "next/server";
import { users } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";
import bcrypt from "bcryptjs";

const USER: Role = "USER";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: "Contraseña actual y nueva contraseña son requeridas" }, { status: 400 });
    }
    if (newPassword.length < 8) {
      return NextResponse.json({ error: "La nueva contraseña debe tener al menos 8 caracteres" }, { status: 400 });
    }

    const user = await users.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Contraseña actual incorrecta" }, { status: 401 });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await users.update(auth.userId, { passwordHash: newPasswordHash });

    return NextResponse.json({ success: true, message: "Contraseña actualizada exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar contraseña", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar contraseña" }, { status: 500 });
  }
}
