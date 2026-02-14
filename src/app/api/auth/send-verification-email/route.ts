import { NextResponse } from "next/server";
import { users, emailVerificationToken } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { sendEmailVerificationEmail } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";
import { newId } from "../../../../lib/id";
import crypto from "crypto";

const USER: Role = "USER";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);

    const user = await users.findById(auth.userId);

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "El email ya está verificado" }, { status: 400 });
    }

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await emailVerificationToken.updateMany({ userId: user.id }, { used: true });
    await emailVerificationToken.create({
      id: newId(),
      userId: user.id,
      token: verificationToken,
      expiresAt,
    });

    await sendEmailVerificationEmail(user.email, verificationToken);

    return NextResponse.json({
      success: true,
      message: "Email de verificación enviado",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error en send-verification-email", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al enviar email de verificación" }, { status: 500 });
  }
}
