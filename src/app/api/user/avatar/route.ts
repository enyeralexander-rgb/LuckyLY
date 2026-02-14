import { NextResponse } from "next/server";
import { users } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import type { Role } from "../../../../lib/db-types";

const USER: Role = "USER";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    const body = await request.json();
    const { avatarUrl } = body;

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "URL de avatar inválida" }, { status: 400 });
    }

    try {
      new URL(avatarUrl);
    } catch {
      return NextResponse.json({ error: "La URL del avatar no es válida" }, { status: 400 });
    }

    await users.update(auth.userId, { avatarUrl });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar avatar", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar avatar" }, { status: 500 });
  }
}
