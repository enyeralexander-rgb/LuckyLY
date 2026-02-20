import { NextResponse } from "next/server";
import { users, passwordResetToken } from "../../../../lib/db";
import { sendPasswordResetEmail } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";
import { newId } from "../../../../lib/id";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const user = await users.findByEmailIgnoreCase(emailLower);

    if (!user) {
      return NextResponse.json({
        success: true,
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    await passwordResetToken.updateMany({ userId: user.id }, { used: true });
    await passwordResetToken.create({
      id: newId(),
      userId: user.id,
      token: resetToken,
      expiresAt,
    });

    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json({
      success: true,
      message: "Si el email existe, recibirás un enlace para restablecer tu contraseña",
    });
  } catch (error) {
    logger.error("Error en forgot-password", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}
