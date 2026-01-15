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
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token requerido para desactivar 2FA" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { twoFactorAuth: true },
    });

    if (!user || !user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      return NextResponse.json({ error: "2FA no está habilitado" }, { status: 400 });
    }

    // Verificar token antes de desactivar
    const isValid = authenticator.verify({
      token,
      secret: user.twoFactorAuth.secret,
    });

    if (!isValid) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    // Desactivar 2FA
    await prisma.twoFactorAuth.update({
      where: { userId: auth.userId },
      data: { enabled: false },
    });

    return NextResponse.json({
      success: true,
      message: "2FA desactivado exitosamente",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al desactivar 2FA" }, { status: 500 });
  }
}
