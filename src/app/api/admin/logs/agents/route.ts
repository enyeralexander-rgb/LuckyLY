import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    
    // Obtener parámetros de filtro por fecha
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");
    
    // Construir filtro de fecha
    const dateFilter: any = {};
    if (dateFrom) {
      dateFilter.gte = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      dateFilter.lte = toDate;
    }
    
    const whereClause: any = {
      actorRole: { in: [Role.AGENT, Role.SUPERADMIN] }
    };
    
    if (Object.keys(dateFilter).length > 0) {
      whereClause.createdAt = dateFilter;
    }
    
    const logs = await prisma.auditLog.findMany({
      where: whereClause,
      include: {
        actor: {
          select: {
            name: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 1000
    });
    
    // Asegurar que todos los campos estén presentes
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
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}

