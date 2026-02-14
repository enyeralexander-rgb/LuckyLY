import { NextResponse } from "next/server";
import { users, passwordResetToken } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";
import bcrypt from "bcryptjs";

export async function POST(request: Request) {
  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token y contraseña son requeridos" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres" }, { status: 400 });
    }

    const resetToken = await passwordResetToken.findUnique({ token });

    if (!resetToken) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
    }

    if (resetToken.used) {
      return NextResponse.json({ error: "Este token ya fue usado" }, { status: 400 });
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await users.update(resetToken.userId, { passwordHash });
    await passwordResetToken.update({ token }, { used: true });

    return NextResponse.json({
      success: true,
      message: "Contraseña restablecida exitosamente",
    });
  } catch (error) {
    logger.error("Error en reset-password", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al restablecer contraseña" }, { status: 500 });
  }
}
