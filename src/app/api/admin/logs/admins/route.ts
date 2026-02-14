import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";

const VALID_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ["MASTER"] as Role[]);
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");
    const adminId = searchParams.get("adminId");
    const dateFilter = searchParams.get("date");

    const actorRoleIn: Role[] = roleFilter && VALID_ROLES.includes(roleFilter as Role) ? [roleFilter as Role] : VALID_ROLES;

    let createdAtGte: Date | undefined;
    let createdAtLte: Date | undefined;
    if (dateFilter) {
      const dateStart = new Date(dateFilter);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateFilter);
      dateEnd.setHours(23, 59, 59, 999);
      createdAtGte = dateStart;
      createdAtLte = dateEnd;
    }

    const logs = await db.auditLog.findMany({
      where: {
        actorId: adminId ?? undefined,
        actorRoleIn,
        createdAtGte,
        createdAtLte,
      },
      take: 5000,
    });

    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[];
    const actors = actorIds.length ? await db.users.findManyByIds(actorIds) : [];
    const actorMap = Object.fromEntries(actors.map((u) => [u.id, u]));

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      entity: log.entity,
      entityId: log.entityId,
      createdAt: new Date(log.createdAt).toISOString(),
      ip: log.ip,
      actor: log.actorId && actorMap[log.actorId] ? { id: actorMap[log.actorId].id, name: actorMap[log.actorId].name, email: actorMap[log.actorId].email, role: actorMap[log.actorId].role } : null,
      meta: log.meta,
    }));

    return NextResponse.json(formattedLogs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener logs de administradores", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
