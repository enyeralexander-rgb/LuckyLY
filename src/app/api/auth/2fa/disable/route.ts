import { NextResponse } from "next/server";
import { users, twoFactorAuth } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";
import { verify } from "../../../../../lib/totp";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: "Token requerido para desactivar 2FA" }, { status: 400 });
    }

    const user = await users.findById(auth.userId);
    const tfa = user ? await twoFactorAuth.findUnique({ userId: auth.userId }) : null;

    if (!user || !tfa || !tfa.enabled) {
      return NextResponse.json({ error: "2FA no está habilitado" }, { status: 400 });
    }

    const isValid = verify({ token, secret: tfa.secret });
    if (!isValid) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    await twoFactorAuth.update({ userId: auth.userId }, { enabled: false });

    return NextResponse.json({ success: true, message: "2FA desactivado exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al desactivar 2FA" }, { status: 500 });
  }
}
