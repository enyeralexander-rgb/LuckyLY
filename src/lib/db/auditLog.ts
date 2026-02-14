import { getSql } from "./neon";
import type { AuditLog, Role } from "../db-types";

export async function create(data: {
  id: string;
  actorId?: string | null;
  actorRole?: Role | null;
  action: string;
  entity?: string | null;
  entityId?: string | null;
  meta?: unknown;
  ip?: string | null;
}): Promise<AuditLog> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "AuditLog" (id, "actorId", "actorRole", action, entity, "entityId", meta, ip, "createdAt")
    VALUES (${data.id}, ${data.actorId ?? null}, ${data.actorRole ?? null}, ${data.action}, ${data.entity ?? null}, ${data.entityId ?? null}, ${data.meta ? JSON.stringify(data.meta) : null}, ${data.ip ?? null}, ${now})
  `;
  const rows = await sql`SELECT * FROM "AuditLog" WHERE id = ${data.id}`;
  return rows[0] as AuditLog;
}

export async function findMany(params?: {
  where?: { actorId?: string; actorRoleIn?: Role[]; createdAtGte?: Date; createdAtLte?: Date };
  orderBy?: { createdAt: "desc" };
  take?: number;
  skip?: number;
}): Promise<AuditLog[]> {
  const sql = getSql();
  const take = params?.take ?? 100;
  const skip = params?.skip ?? 0;
  const w = params?.where;
  if (w?.actorId && (w?.actorRoleIn?.length || w?.createdAtGte != null || w?.createdAtLte != null)) {
    const andRole = w.actorRoleIn?.length ? sql`AND "actorRole" = ANY(${w.actorRoleIn})` : sql``;
    const andGte = w.createdAtGte != null ? sql`AND "createdAt" >= ${w.createdAtGte}` : sql``;
    const andLte = w.createdAtLte != null ? sql`AND "createdAt" <= ${w.createdAtLte}` : sql``;
    const rows = await sql`SELECT * FROM "AuditLog" WHERE "actorId" = ${w.actorId} ${andRole} ${andGte} ${andLte} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as AuditLog[];
  }
  if (w?.actorRoleIn?.length && (w?.createdAtGte != null || w?.createdAtLte != null)) {
    const andGte = w.createdAtGte != null ? sql`AND "createdAt" >= ${w.createdAtGte}` : sql``;
    const andLte = w.createdAtLte != null ? sql`AND "createdAt" <= ${w.createdAtLte}` : sql``;
    const rows = await sql`SELECT * FROM "AuditLog" WHERE "actorRole" = ANY(${w.actorRoleIn}) ${andGte} ${andLte} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as AuditLog[];
  }
  if (w?.actorRoleIn?.length) {
    const rows = await sql`SELECT * FROM "AuditLog" WHERE "actorRole" = ANY(${w.actorRoleIn}) ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as AuditLog[];
  }
  if (params?.where?.actorId) {
    const rows = await sql`SELECT * FROM "AuditLog" WHERE "actorId" = ${params.where.actorId} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as AuditLog[];
  }
  const rows = await sql`SELECT * FROM "AuditLog" ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
  return rows as AuditLog[];
}
