import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { avatarUrl } = body;

    if (!avatarUrl || typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "URL de avatar inválida" }, { status: 400 });
    }

    // Validar que sea una URL válida
    try {
      new URL(avatarUrl);
    } catch {
      return NextResponse.json({ error: "La URL del avatar no es válida" }, { status: 400 });
    }

    // Actualizar avatar
    await prisma.user.update({
      where: { id: auth.userId },
      data: { avatarUrl }
    });

    return NextResponse.json({ success: true, avatarUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar avatar:", err);
    return NextResponse.json({ error: "Error al actualizar avatar" }, { status: 500 });
  }
}
