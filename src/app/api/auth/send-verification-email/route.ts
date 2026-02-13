import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";
import { sendEmailVerificationEmail } from "../../../../lib/email";
import { logger } from "../../../../lib/logger";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json({ error: "El email ya está verificado" }, { status: 400 });
    }

    // Generar token
    const verificationToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

    // Invalidar tokens anteriores
    await prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Crear nuevo token
    await prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        token: verificationToken,
        expiresAt,
      },
    });

    // Enviar email
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
