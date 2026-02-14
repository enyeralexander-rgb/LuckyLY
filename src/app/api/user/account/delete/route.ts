import { NextResponse } from "next/server";
import { users } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";
import bcrypt from "bcryptjs";

const USER: Role = "USER";

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const body = await request.json();
    const { password } = body;

    if (!password) {
      return NextResponse.json({ error: "Contraseña requerida para eliminar la cuenta" }, { status: 400 });
    }

    const user = await users.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Contraseña incorrecta" }, { status: 401 });
    }

    await users.deleteById(auth.userId);

    return NextResponse.json({ success: true, message: "Cuenta eliminada exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al eliminar cuenta", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al eliminar cuenta" }, { status: 500 });
  }
}
