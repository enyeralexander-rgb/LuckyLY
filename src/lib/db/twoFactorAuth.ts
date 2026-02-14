import { getSql } from "./neon";
import type { TwoFactorAuth } from "../db-types";

export async function findUnique(where: { userId: string }): Promise<TwoFactorAuth | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "TwoFactorAuth" WHERE "userId" = ${where.userId}`;
  return (rows[0] as TwoFactorAuth) ?? null;
}

export async function upsert(args: {
  where: { userId: string };
  create: { id: string; userId: string; secret: string; backupCodes?: string[]; enabled?: boolean };
  update: { secret: string; backupCodes?: string[] };
}): Promise<TwoFactorAuth> {
  const sql = getSql();
  const existing = await findUnique({ userId: args.where.userId });
  const now = new Date();
  if (existing) {
    const backupCodes = args.update.backupCodes ?? (existing as { backupCodes?: string[] }).backupCodes ?? [];
    await sql`UPDATE "TwoFactorAuth" SET secret = ${args.update.secret}, "backupCodes" = ${backupCodes}, "updatedAt" = ${now} WHERE "userId" = ${args.where.userId}`;
    const rows = await sql`SELECT * FROM "TwoFactorAuth" WHERE "userId" = ${args.where.userId}`;
    return rows[0] as TwoFactorAuth;
  }
  const backupCodes = args.create.backupCodes ?? [];
  await sql`
    INSERT INTO "TwoFactorAuth" (id, "userId", secret, enabled, "backupCodes", "createdAt", "updatedAt")
    VALUES (${args.create.id}, ${args.create.userId}, ${args.create.secret}, ${args.create.enabled ?? false}, ${backupCodes}, ${now}, ${now})
  `;
  const rows = await sql`SELECT * FROM "TwoFactorAuth" WHERE "userId" = ${args.where.userId}`;
  return rows[0] as TwoFactorAuth;
}

export async function update(where: { userId: string }, data: { enabled: boolean }): Promise<TwoFactorAuth> {
  const sql = getSql();
  const now = new Date();
  await sql`UPDATE "TwoFactorAuth" SET enabled = ${data.enabled}, "updatedAt" = ${now} WHERE "userId" = ${where.userId}`;
  const rows = await sql`SELECT * FROM "TwoFactorAuth" WHERE "userId" = ${where.userId}`;
  return rows[0] as TwoFactorAuth;
}
