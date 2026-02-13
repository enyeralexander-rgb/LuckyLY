import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
import { sendEmailVerificationEmail } from "../../../../../lib/email";
import { logger } from "../../../../../lib/logger";
import crypto from "crypto";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 });
    }

    // Obtener el usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { emailUpdatedAt: true, email: true }
    });

    // Verificar restricción de 30 días
    if (currentUser?.emailUpdatedAt) {
      const lastUpdate = new Date(currentUser.emailUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate < 30) {
        const daysRemaining = 30 - daysSinceUpdate;
        return NextResponse.json({ 
          error: `Solo puedes cambiar tu correo una vez cada 30 días. Faltan ${daysRemaining} días.` 
        }, { status: 400 });
      }
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este correo electrónico ya está en uso" }, { status: 400 });
    }

    // Actualizar correo y registrar timestamp
    const updatedUser = await prisma.user.update({
      where: { id: auth.userId },
      data: { 
        email,
        emailUpdatedAt: new Date(),
        emailVerified: false, // Requiere re-verificación
        emailVerifiedAt: null
      }
    });

    // Enviar correo de verificación al nuevo email
    const verificationToken = crypto.randomBytes(32).toString("hex");
    
    // Invalidar tokens anteriores
    await prisma.emailVerificationToken.updateMany({
      where: { userId: auth.userId, used: false },
      data: { used: true }
    });

    // Crear nuevo token
    await prisma.emailVerificationToken.create({
      data: {
        userId: auth.userId,
        token: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      }
    });

    // Enviar email de verificación
    await sendEmailVerificationEmail(email, verificationToken);

    return NextResponse.json({ 
      success: true, 
      message: "Correo actualizado exitosamente. Te hemos enviado un correo de verificación a tu nueva dirección." 
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar correo", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar correo" }, { status: 500 });
  }
}
