import { NextResponse } from "next/server";
import { users } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";

const USER: Role = "USER";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "El nombre de usuario debe tener al menos 3 caracteres" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    const currentUser = await users.findById(auth.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (currentUser.usernameUpdatedAt) {
      const lastUpdate = new Date(currentUser.usernameUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 30) {
        const daysRemaining = 30 - daysSinceUpdate;
        return NextResponse.json({
          error: `Solo puedes cambiar tu nombre de usuario una vez cada 30 días. Faltan ${daysRemaining} días.`,
        }, { status: 400 });
      }
    }

    const existingUser = await users.findByUsername(cleanUsername);
    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 400 });
    }

    await users.update(auth.userId, {
      username: cleanUsername,
      usernameUpdatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: "Nombre de usuario actualizado exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar username", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar nombre de usuario" }, { status: 500 });
  }
}
