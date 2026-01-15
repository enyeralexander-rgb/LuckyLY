import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
// @ts-ignore
import { authenticator } from "otplib";
// @ts-ignore
import QRCode from "qrcode";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      include: { twoFactorAuth: true },
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si ya tiene 2FA configurado, devolver error
    if (user.twoFactorAuth?.enabled) {
      return NextResponse.json({ error: "2FA ya está habilitado" }, { status: 400 });
    }

    // Generar secreto
    const secret = authenticator.generateSecret();
    const serviceName = "LuckyLY";
    const accountName = user.email;

    // Crear o actualizar registro de 2FA
    const twoFactor = await prisma.twoFactorAuth.upsert({
      where: { userId: auth.userId },
      update: { secret },
      create: {
        userId: auth.userId,
        secret,
        enabled: false,
      },
    });

    // Generar URL para QR code
    const otpAuthUrl = authenticator.keyuri(accountName, serviceName, secret);

    // Generar QR code
    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    } catch (qrError) {
      console.error("Error generando QR:", qrError);
    }

    return NextResponse.json({
      secret,
      qrCode: qrCodeDataUrl,
      otpAuthUrl,
      message: "Escanea el código QR con tu app authenticator",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al configurar 2FA" }, { status: 500 });
  }
}
