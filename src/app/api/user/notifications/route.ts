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
    const read = searchParams.get("read");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = { userId: auth.userId };
    
    // Filtro por estado de lectura
    if (unreadOnly || read === "false") {
      where.read = false;
    } else if (read === "true") {
      where.read = true;
    }

    // Calcular skip para paginación
    const skip = (page - 1) * limit;

    // Obtener total de notificaciones (para paginación)
    const total = await prisma.notification.count({ where });

    // Obtener notificaciones con paginación
    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip
    });

    // Si solo se quiere contar las no leídas (para el badge del header), devolver array directo
    if (unreadOnly) {
      return NextResponse.json(notifications);
    }

    return NextResponse.json({
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
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
    const { notificationId, read, markAllAsRead } = body;

    // Opción 1: Marcar todas como leídas
    if (markAllAsRead === true) {
      await prisma.notification.updateMany({
        where: { 
          userId: auth.userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      });

      return NextResponse.json({ success: true, message: "Todas las notificaciones marcadas como leídas" });
    }

    // Opción 2: Marcar una notificación específica
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
