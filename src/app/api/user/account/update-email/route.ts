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
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();

    const currentUser = await users.findById(auth.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (currentUser.emailUpdatedAt) {
      const lastUpdate = new Date(currentUser.emailUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 30) {
        const daysRemaining = 30 - daysSinceUpdate;
        return NextResponse.json({
          error: `Solo puedes cambiar tu correo una vez cada 30 días. Faltan ${daysRemaining} días.`,
        }, { status: 400 });
      }
    }

    const existingUser = await users.findByEmailIgnoreCase(emailLower);
    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este correo electrónico ya está en uso" }, { status: 400 });
    }

    await users.update(auth.userId, {
      email: emailLower,
      emailUpdatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Correo actualizado exitosamente. Por favor inicia sesión nuevamente.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar correo", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar correo" }, { status: 500 });
  }
}
