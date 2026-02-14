import { NextResponse } from "next/server";
import { users, twoFactorAuth } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);

    const user = await users.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const tfa = await twoFactorAuth.findUnique({ userId: auth.userId });

    return NextResponse.json({
      enabled: tfa?.enabled ?? false,
      configured: !!tfa,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener estado de 2FA" }, { status: 500 });
  }
}
