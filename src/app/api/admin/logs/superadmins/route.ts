import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const logs = await prisma.auditLog.findMany({
      where: { actorRole: Role.SUPERADMIN },
      include: {
        actor: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 500
    });
    
    // Asegurar que siempre devolvamos un array
    return NextResponse.json(Array.isArray(logs) ? logs : []);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener logs de superadmins", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}

