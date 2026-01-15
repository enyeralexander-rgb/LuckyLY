import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    const where: any = { userId: auth.userId };
    if (unreadOnly) {
      where.read = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json(notifications);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener notificaciones:", err);
    return NextResponse.json({ error: "Error al obtener notificaciones" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    const { notificationId, read } = body;

    if (!notificationId || typeof read !== "boolean") {
      return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: { id: notificationId, userId: auth.userId }
    });

    if (!notification) {
      return NextResponse.json({ error: "Notificación no encontrada" }, { status: 404 });
    }

    // Actualizar estado de lectura
    await prisma.notification.update({
      where: { id: notificationId },
      data: {
        read,
        readAt: read ? new Date() : null
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar notificación:", err);
    return NextResponse.json({ error: "Error al actualizar notificación" }, { status: 500 });
  }
}
