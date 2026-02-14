import { NextResponse } from "next/server";
import { users, twoFactorAuth } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";
import { generateSecret, keyuri } from "../../../../../lib/totp";
import { newId } from "../../../../../lib/id";
// @ts-ignore
import QRCode from "qrcode";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);

    const user = await users.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const tfa = await twoFactorAuth.findUnique({ userId: auth.userId });
    if (tfa?.enabled) {
      return NextResponse.json({ error: "2FA ya está habilitado" }, { status: 400 });
    }

    const secret = generateSecret();
    const serviceName = "LuckyLY";
    const accountName = user.email;

    const twoFactor = await twoFactorAuth.upsert({
      where: { userId: auth.userId },
      update: { secret },
      create: {
        id: newId(),
        userId: auth.userId,
        secret,
        enabled: false,
      },
    });

    const otpAuthUrl = keyuri(accountName, serviceName, secret);

    let qrCodeDataUrl = "";
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpAuthUrl);
    } catch (qrError) {
      logger.error("Error generando QR", { error: qrError instanceof Error ? qrError.message : String(qrError) });
    }

    return NextResponse.json({
      secret: twoFactor.secret,
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
