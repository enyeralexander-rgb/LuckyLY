import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { sendPasswordResetEmail } from "../../../../lib/email";
import crypto from "crypto";

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // No revelar si el email existe o no (seguridad)
      return NextResponse.json({
        success: true,
        message: "Si el email existe, recibirás un enlace para restablecer tu contraseña",
      });
    }

    // Generar token seguro
    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Expira en 1 hora

    // Invalidar tokens anteriores
    await prisma.passwordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });

    // Crear nuevo token
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        token: resetToken,
        expiresAt,
      },
    });

    // Enviar email
    await sendPasswordResetEmail(user.email, resetToken);

    return NextResponse.json({
      success: true,
      message: "Si el email existe, recibirás un enlace para restablecer tu contraseña",
    });
  } catch (error) {
    console.error("Error en forgot-password:", error);
    return NextResponse.json({ error: "Error al procesar solicitud" }, { status: 500 });
  }
}
