import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../../lib/prisma";
import { Role } from "@prisma/client";
// @ts-ignore
import { authenticator } from "otplib";

const JWT_SECRET = process.env.JWT_SECRET || "insecure-secret";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { twoFactorToken, code } = body;

    if (!twoFactorToken || !code) {
      return NextResponse.json({ error: "Token y código son requeridos" }, { status: 400 });
    }

    // Verificar el token temporal de 2FA
    let decoded: any;
    try {
      decoded = jwt.verify(twoFactorToken, JWT_SECRET);
    } catch (jwtError) {
      return NextResponse.json({ error: "Token expirado o inválido. Por favor, inicia sesión de nuevo." }, { status: 401 });
    }

    if (decoded.type !== "2fa_pending") {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const userId = decoded.sub;

    // Obtener usuario y su 2FA
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorAuth: true },
    });

    if (!user || !user.twoFactorAuth) {
      return NextResponse.json({ error: "Usuario no encontrado o 2FA no configurado" }, { status: 404 });
    }

    // Verificar código 2FA
    const isValid = authenticator.verify({
      token: code,
      secret: user.twoFactorAuth.secret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Código de verificación inválido" }, { status: 400 });
    }

    // Código válido, generar token de sesión completo
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });

    // Registrar log de inicio de sesión con 2FA
    const isAdmin = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER].includes(user.role);
    if (isAdmin) {
      try {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            action: "LOGIN_2FA",
            entity: "User",
            entityId: user.id,
            ip,
            meta: {
              email: user.email,
              status: "ACTIVE",
              method: "2FA"
            }
          }
        });
      } catch (logError) {
        console.error("Error al registrar log de login 2FA:", logError);
      }
    }

    const res = NextResponse.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }, { status: 200 });

    res.cookies.set("auth_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    return res;
  } catch (error) {
    console.error("Error en verificación 2FA login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
