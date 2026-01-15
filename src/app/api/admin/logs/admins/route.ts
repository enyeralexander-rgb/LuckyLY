import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role"); // AGENT, SUPERADMIN, MASTER
    const adminId = searchParams.get("adminId"); // ID específico del administrador
    const dateFilter = searchParams.get("date"); // Fecha en formato YYYY-MM-DD

    const where: any = {
      actorRole: { in: [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER] }
    };

    // Filtrar por rol de administrador
    const validRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (roleFilter && validRoles.includes(roleFilter as Role)) {
      where.actorRole = roleFilter as Role;
    }

    // Filtrar por administrador específico
    if (adminId) {
      where.actorId = adminId;
    }

    // Filtrar por fecha
    if (dateFilter) {
      const dateStart = new Date(dateFilter);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateFilter);
      dateEnd.setHours(23, 59, 59, 999);
      where.createdAt = {
        gte: dateStart,
        lte: dateEnd
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 5000 // Aumentado para permitir más logs
    });

    // Formatear logs para incluir información completa
    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: log.createdAt.toISOString(),
      ip: log.ip,
      actor: log.actor,
      meta: log.meta
    }));

    return NextResponse.json(formattedLogs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener logs de administradores:", err);
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
