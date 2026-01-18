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

    // Obtener el usuario actual
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { emailUpdatedAt: true }
    });

    // Verificar restricción de 30 días
    if (currentUser?.emailUpdatedAt) {
      const lastUpdate = new Date(currentUser.emailUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate < 30) {
        const daysRemaining = 30 - daysSinceUpdate;
        return NextResponse.json({ 
          error: `Solo puedes cambiar tu correo una vez cada 30 días. Faltan ${daysRemaining} días.` 
        }, { status: 400 });
      }
    }

    // Verificar si el correo ya existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser && existingUser.id !== auth.userId) {
      return NextResponse.json({ error: "Este correo electrónico ya está en uso" }, { status: 400 });
    }

    // Actualizar correo y registrar timestamp
    await prisma.user.update({
      where: { id: auth.userId },
      data: { 
        email,
        emailUpdatedAt: new Date(),
        emailVerified: false, // Requiere re-verificación
        emailVerifiedAt: null
      }
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
