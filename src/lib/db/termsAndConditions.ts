import { getSql } from "./neon";
import type { TermsAndConditions } from "../db-types";

export async function findFirst(): Promise<TermsAndConditions | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "TermsAndConditions" LIMIT 1`;
  return (rows[0] as TermsAndConditions) ?? null;
}

export async function create(data: { id: string; content: string; updatedById?: string | null }): Promise<TermsAndConditions> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "TermsAndConditions" (id, content, "updatedAt", "updatedById")
    VALUES (${data.id}, ${data.content}, ${now}, ${data.updatedById ?? null})
  `;
  const rows = await sql`SELECT * FROM "TermsAndConditions" WHERE id = ${data.id}`;
  return rows[0] as TermsAndConditions;
}

export async function update(id: string, data: { content: string; updatedById?: string | null }): Promise<void> {
  const sql = getSql();
  const now = new Date();
  await sql`UPDATE "TermsAndConditions" SET content = ${data.content}, "updatedAt" = ${now}, "updatedById" = ${data.updatedById ?? null} WHERE id = ${id}`;
}
