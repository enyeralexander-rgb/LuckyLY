import { getSql } from "./neon";
import type { ReferralVisit } from "../db-types";

export async function create(data: { id: string; referralLinkId: string; userId?: string | null; ip?: string | null; userAgent?: string | null; country?: string | null; registered?: boolean }): Promise<ReferralVisit> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "ReferralVisit" (id, "referralLinkId", "userId", ip, "userAgent", country, registered, "createdAt")
    VALUES (${data.id}, ${data.referralLinkId}, ${data.userId ?? null}, ${data.ip ?? null}, ${data.userAgent ?? null}, ${data.country ?? null}, ${data.registered ?? false}, ${now})
  `;
  const rows = await sql`SELECT * FROM "ReferralVisit" WHERE id = ${data.id}`;
  return rows[0] as ReferralVisit;
}

export async function findFirst(params: { where: { referralLinkId: string; userId: null; registered: false }; orderBy: { createdAt: "desc" } }): Promise<ReferralVisit | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "ReferralVisit" WHERE "referralLinkId" = ${params.where.referralLinkId} AND "userId" IS NULL AND registered = false ORDER BY "createdAt" DESC LIMIT 1`;
  return (rows[0] as ReferralVisit) ?? null;
}

export async function update(id: string, data: { userId?: string | null; registered?: boolean; purchased?: boolean; country?: string | null }): Promise<void> {
  const sql = getSql();
  if (data.purchased !== undefined) {
    await sql`UPDATE "ReferralVisit" SET purchased = ${data.purchased} WHERE id = ${id}`;
  }
  if (data.userId !== undefined || data.registered !== undefined || data.country !== undefined) {
    const rows = await sql`SELECT "userId", registered, country FROM "ReferralVisit" WHERE id = ${id}`;
    const current = rows[0] as { userId: string | null; registered: boolean; country: string | null } | undefined;
    if (!current) return;
    const userId = data.userId !== undefined ? data.userId : current.userId;
    const registered = data.registered !== undefined ? data.registered : current.registered;
    const country = data.country !== undefined ? data.country : current.country;
    await sql`UPDATE "ReferralVisit" SET "userId" = ${userId}, registered = ${registered}, country = ${country} WHERE id = ${id}`;
  }
}

/** Última visita del usuario con purchased = false (para marcar compra en referido) */
export async function findFirstByUserPurchasedFalse(userId: string): Promise<ReferralVisit | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "ReferralVisit" WHERE "userId" = ${userId} AND purchased = false ORDER BY "createdAt" DESC LIMIT 1`;
  return (rows[0] as ReferralVisit) ?? null;
}

export async function findMany(params?: { where?: { referralLinkId?: string; referralLinkIds?: string[]; country?: string; createdAtGte?: Date; createdAtLte?: Date }; take?: number; distinct?: ("country")[] }): Promise<ReferralVisit[]> {
  const sql = getSql();
  const take = params?.take ?? 1000;
  if (params?.where?.createdAtGte != null && params?.where?.createdAtLte != null) {
    const rows = await sql`SELECT * FROM "ReferralVisit" WHERE "createdAt" >= ${params.where.createdAtGte} AND "createdAt" <= ${params.where.createdAtLte} ORDER BY "createdAt" DESC LIMIT ${take}`;
    return rows as ReferralVisit[];
  }
  if (params?.where?.referralLinkId && params?.distinct?.includes("country")) {
    const rows = await sql`SELECT DISTINCT country FROM "ReferralVisit" WHERE "referralLinkId" = ${params.where.referralLinkId} AND country IS NOT NULL LIMIT ${take}`;
    return rows as ReferralVisit[];
  }
  if (params?.where?.referralLinkIds?.length) {
    const rows = await sql`SELECT * FROM "ReferralVisit" WHERE "referralLinkId" = ANY(${params.where.referralLinkIds}) ORDER BY "createdAt" DESC LIMIT ${take}`;
    return rows as ReferralVisit[];
  }
  if (params?.where?.referralLinkId) {
    const rows = await sql`SELECT * FROM "ReferralVisit" WHERE "referralLinkId" = ${params.where.referralLinkId} ORDER BY "createdAt" DESC LIMIT ${take}`;
    return rows as ReferralVisit[];
  }
  const rows = await sql`SELECT * FROM "ReferralVisit" ORDER BY "createdAt" DESC LIMIT ${take}`;
  return rows as ReferralVisit[];
}

export async function count(where?: { referralLinkId?: string; registered?: boolean }): Promise<number> {
  const sql = getSql();
  if (where?.referralLinkId !== undefined && where?.registered !== undefined) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "ReferralVisit" WHERE "referralLinkId" = ${where.referralLinkId} AND registered = ${where.registered}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  if (where?.referralLinkId) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "ReferralVisit" WHERE "referralLinkId" = ${where.referralLinkId}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "ReferralVisit"`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}
