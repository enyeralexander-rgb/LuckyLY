import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json({ error: "Correo electrónico inválido" }, { status: 400 });
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este correo electrónico ya está en uso" }, { status: 400 });
    }

    // Actualizar correo
    await prisma.user.update({
      where: { id: auth.userId },
      data: { email }
    });

    return NextResponse.json({ success: true, message: "Correo actualizado exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar correo:", err);
    return NextResponse.json({ error: "Error al actualizar correo" }, { status: 500 });
  }
}
