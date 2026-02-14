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
    const { token, enable } = body;

    if (!token) {
      return NextResponse.json({ error: "Token requerido" }, { status: 400 });
    }

    const user = await users.findById(auth.userId);
    const tfa = user ? await twoFactorAuth.findUnique({ userId: auth.userId }) : null;

    if (!user || !tfa) {
      return NextResponse.json({ error: "2FA no configurado" }, { status: 400 });
    }

    const isValid = verify({ token, secret: tfa.secret });
    if (!isValid) {
      return NextResponse.json({ error: "Token inválido" }, { status: 400 });
    }

    if (enable === true) {
      await twoFactorAuth.update({ userId: auth.userId }, { enabled: true });
      return NextResponse.json({ success: true, message: "2FA habilitado exitosamente" });
    }

    return NextResponse.json({ success: true, message: "Token verificado correctamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al verificar token" }, { status: 500 });
  }
}
