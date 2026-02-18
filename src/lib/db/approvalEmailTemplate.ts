import { getSql } from "./neon";

const ROW_ID = "default";

export async function getBody(): Promise<string | null> {
  try {
    const sql = getSql();
    const rows = await sql`SELECT body FROM "ApprovalEmailTemplate" WHERE id = ${ROW_ID} LIMIT 1`;
    const row = rows[0] as { body: string | null } | undefined;
    return row?.body ?? null;
  } catch {
    return null;
  }
}

export async function setBody(body: string): Promise<void> {
  try {
    const sql = getSql();
    const now = new Date();
    await sql`
      INSERT INTO "ApprovalEmailTemplate" (id, body, "updatedAt")
      VALUES (${ROW_ID}, ${body}, ${now})
      ON CONFLICT (id) DO UPDATE SET body = ${body}, "updatedAt" = ${now}
    `;
  } catch {
    // Table may not exist if migration hasn't run yet
  }
}
