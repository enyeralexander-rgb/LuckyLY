import { getSql } from "./neon";
import type { LiveConfig } from "../db-types";

export async function findFirst(params?: { orderBy?: { updatedAt: "desc" } }): Promise<LiveConfig | null> {
  const sql = getSql();
  const rows = params?.orderBy?.updatedAt === "desc"
    ? await sql`SELECT * FROM "LiveConfig" ORDER BY "updatedAt" DESC LIMIT 1`
    : await sql`SELECT * FROM "LiveConfig" LIMIT 1`;
  return (rows[0] as LiveConfig) ?? null;
}

export async function create(data: { id: string; streamUrl?: string | null; chatIframeUrl?: string | null; updatedById?: string | null }): Promise<LiveConfig> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "LiveConfig" (id, "streamUrl", "chatIframeUrl", "updatedAt", "updatedById")
    VALUES (${data.id}, ${data.streamUrl ?? null}, ${data.chatIframeUrl ?? null}, ${now}, ${data.updatedById ?? null})
  `;
  const rows = await sql`SELECT * FROM "LiveConfig" WHERE id = ${data.id}`;
  return rows[0] as LiveConfig;
}

export async function update(id: string, data: { streamUrl?: string | null; chatIframeUrl?: string | null; updatedById?: string | null }): Promise<LiveConfig> {
  const sql = getSql();
  const now = new Date();
  if (data.streamUrl !== undefined) await sql`UPDATE "LiveConfig" SET "streamUrl" = ${data.streamUrl}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.chatIframeUrl !== undefined) await sql`UPDATE "LiveConfig" SET "chatIframeUrl" = ${data.chatIframeUrl}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.updatedById !== undefined) await sql`UPDATE "LiveConfig" SET "updatedById" = ${data.updatedById}, "updatedAt" = ${now} WHERE id = ${id}`;
  const rows = await sql`SELECT * FROM "LiveConfig" WHERE id = ${id}`;
  return rows[0] as LiveConfig;
}
