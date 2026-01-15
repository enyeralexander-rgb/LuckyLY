import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { username } = body;

    if (!username || typeof username !== "string" || username.trim().length < 3) {
      return NextResponse.json({ error: "El nombre de usuario debe tener al menos 3 caracteres" }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();

    // Verificar si el username ya existe
    const existingUser = await prisma.user.findUnique({
      where: { username: cleanUsername }
    });

    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 400 });
    }

    // Actualizar username
    await prisma.user.update({
      where: { id: auth.userId },
      data: { username: cleanUsername }
    });

    return NextResponse.json({ success: true, message: "Nombre de usuario actualizado exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar username:", err);
    return NextResponse.json({ error: "Error al actualizar nombre de usuario" }, { status: 500 });
  }
}
