import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { logger } from "../../../../lib/logger";

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

    // Si el token ya fue usado, verificar si el email ya está verificado
    if (verificationToken.used) {
      // Verificar si el usuario ya tiene el email verificado
      if (verificationToken.user?.emailVerified) {
        return NextResponse.json({ 
          success: true, 
          message: "Email ya verificado previamente",
          alreadyVerified: true 
        }, { status: 200 });
      }
      return NextResponse.json({ error: "Este enlace ya fue utilizado" }, { status: 400 });
    }

    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
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

    return NextResponse.json({ 
      success: true, 
      message: "Email verificado exitosamente" 
    }, { status: 200 });
  } catch (error) {
    logger.error("Error en verify-email", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al verificar email" }, { status: 500 });
  }
}
