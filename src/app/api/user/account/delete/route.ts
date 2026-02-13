import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Contraseña requerida para eliminar la cuenta" }, { status: 400 });
    }

    // Obtener usuario con contraseña
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { passwordHash: true }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    // Eliminar usuario (las relaciones se eliminarán en cascada según el schema)
    await prisma.user.delete({
      where: { id: auth.userId }
    });

    return NextResponse.json({ success: true, message: "Cuenta eliminada exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al eliminar cuenta", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
