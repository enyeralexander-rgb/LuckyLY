import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
// @ts-ignore
import { authenticator } from "otplib";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    const { token, enable } = body;

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { twoFactorAuth: true },
    });

    if (!user || !user.twoFactorAuth) {
      return NextResponse.json({ error: "2FA no configurado" }, { status: 400 });
    }

    // Verificar token
    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorAuth.secret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    // Si se solicita habilitar, habilitar 2FA
    if (enable === true) {
      await prisma.twoFactorAuth.update({
        where: { userId: auth.userId },
        data: { enabled: true },
      });

      return NextResponse.json({
        success: true,
        message: "2FA habilitado exitosamente",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Token verificado correctamente",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al verificar token" }, { status: 500 });
  }
}
