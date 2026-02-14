import { getSql } from "./neon";
import type { PasswordResetToken } from "../db-types";

export async function findUnique(where: { token: string }): Promise<PasswordResetToken | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "PasswordResetToken" WHERE token = ${where.token} LIMIT 1`;
  return (rows[0] as PasswordResetToken) ?? null;
}

export async function updateMany(where: { userId: string }, data: { used: boolean }): Promise<void> {
  const sql = getSql();
  await sql`UPDATE "PasswordResetToken" SET used = ${data.used} WHERE "userId" = ${where.userId}`;
}

export async function create(data: { id: string; userId: string; token: string; expiresAt: Date }): Promise<PasswordResetToken> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "PasswordResetToken" (id, "userId", token, "expiresAt", "createdAt")
    VALUES (${data.id}, ${data.userId}, ${data.token}, ${data.expiresAt}, ${now})
  `;
  const rows = await sql`SELECT * FROM "PasswordResetToken" WHERE id = ${data.id}`;
  return rows[0] as PasswordResetToken;
}

export async function update(where: { token: string }, data: { used: boolean }): Promise<void> {
  const sql = getSql();
  await sql`UPDATE "PasswordResetToken" SET used = ${data.used} WHERE token = ${where.token}`;
}
