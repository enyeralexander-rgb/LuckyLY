import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { emailVerificationToken, users } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const verificationToken = await emailVerificationToken.findUnique({ token });

    if (!verificationToken) {
      return NextResponse.json({ error: "Token inválido o expirado" }, { status: 400 });
    }

    if (verificationToken.used) {
      if (verificationToken.user?.emailVerified) {
        return NextResponse.json({
          success: true,
          message: "Email ya verificado previamente",
          alreadyVerified: true,
        }, { status: 200 });
      }
      return NextResponse.json({ error: "Este enlace ya fue utilizado" }, { status: 400 });
    }

    if (new Date() > verificationToken.expiresAt) {
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    await users.update(verificationToken.userId, { emailVerified: true, emailVerifiedAt: new Date() });
    await emailVerificationToken.update({ id: verificationToken.id }, { used: true });

    return NextResponse.json({
      success: true,
      message: "Email verificado exitosamente",
    }, { status: 200 });
  } catch (error) {
    logger.error("Error en verify-email", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al verificar email" }, { status: 500 });
  }
}
