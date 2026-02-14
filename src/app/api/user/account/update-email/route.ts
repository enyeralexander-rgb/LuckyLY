import { NextResponse } from "next/server";
import { users, emailVerificationToken } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { sendEmailVerificationEmail } from "../../../../../lib/email";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";
import { newId } from "../../../../../lib/id";
import crypto from "crypto";

const USER: Role = "USER";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 });
    }

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

    const existingUser = await users.findByEmail(email);
    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este correo electrónico ya está en uso" }, { status: 400 });
    }

    await users.update(auth.userId, {
      email,
      emailUpdatedAt: new Date(),
      emailVerified: false,
      emailVerifiedAt: null,
    });

    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await emailVerificationToken.updateMany({ userId: auth.userId }, { used: true });
    await emailVerificationToken.create({
      id: newId(),
      userId: auth.userId,
      token: verificationToken,
      expiresAt,
    });

    await sendEmailVerificationEmail(email, verificationToken);

    return NextResponse.json({
      success: true,
      message: "Correo actualizado exitosamente. Te hemos enviado un correo de verificación a tu nueva dirección.",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar correo", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar correo" }, { status: 500 });
  }
}
