import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    // Buscar token válido
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!verificationToken) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
    }

    if (verificationToken.used) {
      return NextResponse.json({ error: "Este email ya fue verificado" }, { status: 400 });
    }

    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json({ error: "Token expirado" }, { status: 400 });
    }

    // Verificar email y marcar token como usado
    await prisma.$transaction([
      prisma.user.update({
        where: { id: verificationToken.userId },
        data: { emailVerified: true, emailVerifiedAt: new Date() },
      }),
      prisma.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { used: true },
      }),
    ]);

    // Redirigir a la página de verificación exitosa
    const verifyUrl = new URL("/auth/verify-email", request.url);
    verifyUrl.searchParams.set("token", token);
    return NextResponse.redirect(verifyUrl);
  } catch (error) {
    console.error("Error en verify-email:", error);
    return NextResponse.json({ error: "Error al verificar email" }, { status: 500 });
  }
}
