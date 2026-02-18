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

    // Atomic: mark token as used in a single UPDATE ... WHERE used = false RETURNING *
    // Only one concurrent request can win this race.
    const markedToken = await emailVerificationToken.markUsedAtomically(token);

    if (!markedToken) {
      // Token didn't exist OR was already used.
      // Check if the user's email is already verified (benign double-click).
      const existingToken = await emailVerificationToken.findUnique({ token });
      if (existingToken?.user?.emailVerified) {
        return NextResponse.json({
          success: true,
          message: "Email ya verificado previamente",
          alreadyVerified: true,
        }, { status: 200 });
      }
      return NextResponse.json({ error: "Token inválido o ya fue utilizado" }, { status: 400 });
    }

    // Token was successfully claimed. Now check expiration.
    if (new Date() > markedToken.expiresAt) {
      // Expired — revert the used flag so user can request a new token
      await emailVerificationToken.update({ id: markedToken.id }, { used: false });
      return NextResponse.json({ error: "El enlace ha expirado. Solicita uno nuevo." }, { status: 400 });
    }

    // Verify the user's email
    await users.update(markedToken.userId, { emailVerified: true, emailVerifiedAt: new Date() });

    return NextResponse.json({
      success: true,
      message: "Email verificado exitosamente",
    }, { status: 200 });
  } catch (error) {
    logger.error("Error en verify-email", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al verificar email" }, { status: 500 });
  }
}
