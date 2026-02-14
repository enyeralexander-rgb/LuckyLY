import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { searchParams } = new URL(request.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    let createdAtGte: Date | undefined;
    let createdAtLte: Date | undefined;
    if (dateFrom) createdAtGte = new Date(dateFrom);
    if (dateTo) {
      const to = new Date(dateTo);
      to.setHours(23, 59, 59, 999);
      createdAtLte = to;
    }

    const logs = await db.auditLog.findMany({
      where: {
        actorRoleIn: ["AGENT", "SUPERADMIN"] as Role[],
        createdAtGte,
        createdAtLte,
      },
      take: 1000,
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
      actor: log.actorId && actorMap[log.actorId] ? { name: actorMap[log.actorId].name, email: actorMap[log.actorId].email, role: actorMap[log.actorId].role } : null,
      meta: log.meta,
    }));

    return NextResponse.json(formattedLogs);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
