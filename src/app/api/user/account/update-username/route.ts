import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { Role } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "El nombre de usuario debe tener al menos 3 caracteres" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Obtener el usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { usernameUpdatedAt: true }
    });

    // Verificar restricción de 30 días
    if (currentUser?.usernameUpdatedAt) {
      const lastUpdate = new Date(currentUser.usernameUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate < 30) {
        const daysRemaining = 30 - daysSinceUpdate;
        return NextResponse.json({ 
          error: `Solo puedes cambiar tu nombre de usuario una vez cada 30 días. Faltan ${daysRemaining} días.` 
        }, { status: 400 });
      }
    }

    // Verificar si el username ya existe
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 400 });
    }

    // Actualizar username y registrar timestamp
    await prisma.user.update({
      where: { id: auth.userId },
      data: { 
        username: cleanUsername,
        usernameUpdatedAt: new Date()
      }
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
