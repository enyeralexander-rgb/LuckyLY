import { getSql } from "./neon";
import type { EmailVerificationToken } from "../db-types";

export async function updateMany(where: { userId: string }, data: { used: boolean }): Promise<void> {
  const sql = getSql();
  await sql`UPDATE "EmailVerificationToken" SET used = ${data.used} WHERE "userId" = ${where.userId}`;
}

export async function create(data: { id: string; userId: string; token: string; expiresAt: Date }): Promise<EmailVerificationToken> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "EmailVerificationToken" (id, "userId", token, "expiresAt", "createdAt")
    VALUES (${data.id}, ${data.userId}, ${data.token}, ${data.expiresAt}, ${now})
  `;
  const rows = await sql`SELECT * FROM "EmailVerificationToken" WHERE id = ${data.id}`;
  return rows[0] as EmailVerificationToken;
}

export async function findUnique(where: { token: string }): Promise<(EmailVerificationToken & { user?: { id: string; email: string; emailVerified?: boolean } }) | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "EmailVerificationToken" WHERE token = ${where.token} LIMIT 1`;
  const row = rows[0] as EmailVerificationToken | undefined;
  if (!row) return null;
  const userRows = await sql`SELECT id, email, "emailVerified" FROM "User" WHERE id = ${row.userId}`;
  const user = userRows[0] as { id: string; email: string; emailVerified?: boolean } | undefined;
  return { ...row, user: user ?? undefined } as EmailVerificationToken & { user?: { id: string; email: string; emailVerified?: boolean } };
}

export async function update(where: { id: string }, data: { used: boolean }): Promise<void> {
  const sql = getSql();
  await sql`UPDATE "EmailVerificationToken" SET used = ${data.used} WHERE id = ${where.id}`;
}
