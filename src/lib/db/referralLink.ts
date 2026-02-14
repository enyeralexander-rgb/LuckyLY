import { getSql } from "./neon";
import type { ReferralLink } from "../db-types";

export async function findById(id: string): Promise<ReferralLink | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "ReferralLink" WHERE id = ${id}`;
  return (rows[0] as ReferralLink) ?? null;
}

export async function findUnique(where: { code: string }): Promise<ReferralLink | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "ReferralLink" WHERE code = ${where.code}`;
  return (rows[0] as ReferralLink) ?? null;
}

export async function findMany(where?: { createdById?: string }): Promise<ReferralLink[]> {
  const sql = getSql();
  if (where?.createdById) {
    const rows = await sql`SELECT * FROM "ReferralLink" WHERE "createdById" = ${where.createdById} ORDER BY "createdAt" DESC`;
    return rows as ReferralLink[];
  }
  const rows = await sql`SELECT * FROM "ReferralLink" ORDER BY "createdAt" DESC`;
  return rows as ReferralLink[];
}

export async function create(data: { id: string; code: string; name: string; createdById: string }): Promise<ReferralLink> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "ReferralLink" (id, code, name, "createdById", "createdAt", "updatedAt")
    VALUES (${data.id}, ${data.code}, ${data.name}, ${data.createdById}, ${now}, ${now})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("ReferralLink create failed");
  return created;
}

export async function update(id: string, data: { clicks?: number; registrations?: number; purchases?: number; revenue?: number | string }): Promise<ReferralLink> {
  const sql = getSql();
  const now = new Date();
  if (data.clicks !== undefined) await sql`UPDATE "ReferralLink" SET clicks = ${data.clicks}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.registrations !== undefined) await sql`UPDATE "ReferralLink" SET registrations = ${data.registrations}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.purchases !== undefined) await sql`UPDATE "ReferralLink" SET purchases = ${data.purchases}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.revenue !== undefined) await sql`UPDATE "ReferralLink" SET revenue = ${data.revenue}, "updatedAt" = ${now} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("ReferralLink update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "ReferralLink" WHERE id = ${id}`;
}
