import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { users, twoFactorAuth, auditLog } from "../../../../../lib/db";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";
import { verify } from "../../../../../lib/totp";
import { newId } from "../../../../../lib/id";

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL: JWT_SECRET is not defined (2FA login-verify)");
  }
  return secret;
}

const ADMIN_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { twoFactorToken, code } = body;

    if (!twoFactorToken || !code) {
      return NextResponse.json({ error: "Token y código son requeridos" }, { status: 400 });
    }

    const JWT_SECRET = getJwtSecret();
    let decoded: { type?: string; sub?: string };
    try {
      decoded = jwt.verify(twoFactorToken, JWT_SECRET) as { type?: string; sub?: string };
    } catch {
      return NextResponse.json({ error: "Token expirado o inválido. Por favor, inicia sesión de nuevo." }, { status: 401 });
    }

    if (decoded.type !== "2fa_pending") {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userId = decoded.sub;
    if (!userId) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const user = await users.findById(userId);
    const tfa = user ? await twoFactorAuth.findUnique({ userId }) : null;

    if (!user || !tfa) {
      return NextResponse.json({ error: "Usuario no encontrado o 2FA no configurado" }, { status: 404 });
    }

    const isValid = verify({ token: code, secret: tfa.secret });
    if (!isValid) {
      return NextResponse.json({ error: "Código de verificación inválido" }, { status: 400 });
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });

    if (ADMIN_ROLES.includes(user.role)) {
      try {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        await auditLog.create({
          id: newId(),
          actorId: user.id,
          actorRole: user.role,
          action: "LOGIN_2FA",
          entity: "User",
          entityId: user.id,
          ip,
          meta: { email: user.email, status: "ACTIVE", method: "2FA" },
        });
      } catch (logError) {
        logger.error("Error al registrar log de login 2FA", { error: logError instanceof Error ? logError.message : String(logError) });
      }
    }

    const res = NextResponse.json(
      {
        success: true,
        token,
        user: { id: user.id, email: user.email, role: user.role },
      },
      { status: 200 }
    );

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });

    return res;
  } catch (error) {
    logger.error("Error en verificación 2FA login", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
