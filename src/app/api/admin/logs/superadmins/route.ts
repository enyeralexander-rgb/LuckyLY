import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "@/lib/db-types";

export async function GET(request: Request) {
  try {
    requireAuth(request, ["MASTER"] as Role[]);
    const logs = await db.auditLog.findMany({
      where: { actorRoleIn: ["SUPERADMIN"] },
      take: 500,
    });

    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[];
    const actors = actorIds.length ? await db.users.findManyByIds(actorIds) : [];
    const actorMap = Object.fromEntries(actors.map((u) => [u.id, u]));

    const formattedLogs = logs.map((log) => ({
      ...log,
      createdAt: new Date(log.createdAt).toISOString(),
      actor: log.actorId && actorMap[log.actorId] ? { name: actorMap[log.actorId].name, email: actorMap[log.actorId].email } : null,
    }));

    return NextResponse.json(Array.isArray(formattedLogs) ? formattedLogs : []);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener logs de superadmins", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener logs" }, { status: 500 });
  }
}
