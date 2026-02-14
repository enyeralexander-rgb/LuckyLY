import { getSql } from "./neon";
import type { RaffleTemplate, DrawType } from "../db-types";

export async function findById(id: string): Promise<RaffleTemplate | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "RaffleTemplate" WHERE id = ${id}`;
  return (rows[0] as RaffleTemplate) ?? null;
}

export async function findMany(): Promise<RaffleTemplate[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "RaffleTemplate" ORDER BY "createdAt" DESC`;
  return rows as RaffleTemplate[];
}

export async function create(data: { id: string; name: string; description?: string | null; type: DrawType; pricePerSlot: number | string; slots: number; winnersCount?: number; mirrorMode?: boolean; prizes?: unknown; createdById?: string | null }): Promise<RaffleTemplate> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "RaffleTemplate" (id, name, description, type, "pricePerSlot", slots, "winnersCount", "mirrorMode", prizes, "createdById", "createdAt", "updatedAt")
    VALUES (${data.id}, ${data.name}, ${data.description ?? null}, ${data.type}, ${data.pricePerSlot}, ${data.slots}, ${data.winnersCount ?? 1}, ${data.mirrorMode ?? false}, ${data.prizes ? JSON.stringify(data.prizes) : null}, ${data.createdById ?? null}, ${now}, ${now})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("RaffleTemplate create failed");
  return created;
}

export async function update(id: string, data: Partial<{
  name: string;
  description: string | null;
  type: DrawType;
  pricePerSlot: number | string;
  slots: number;
  winnersCount: number;
  mirrorMode: boolean;
  prizes: unknown;
}>): Promise<RaffleTemplate> {
  const sql = getSql();
  const now = new Date();
  if (data.name !== undefined) await sql`UPDATE "RaffleTemplate" SET name = ${data.name}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.description !== undefined) await sql`UPDATE "RaffleTemplate" SET description = ${data.description}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.type !== undefined) await sql`UPDATE "RaffleTemplate" SET type = ${data.type}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.pricePerSlot !== undefined) await sql`UPDATE "RaffleTemplate" SET "pricePerSlot" = ${data.pricePerSlot}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.slots !== undefined) await sql`UPDATE "RaffleTemplate" SET slots = ${data.slots}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.winnersCount !== undefined) await sql`UPDATE "RaffleTemplate" SET "winnersCount" = ${data.winnersCount}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.mirrorMode !== undefined) await sql`UPDATE "RaffleTemplate" SET "mirrorMode" = ${data.mirrorMode}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.prizes !== undefined) await sql`UPDATE "RaffleTemplate" SET prizes = ${data.prizes ? JSON.stringify(data.prizes) : null}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (Object.keys(data).length === 0) await sql`UPDATE "RaffleTemplate" SET "updatedAt" = ${now} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("RaffleTemplate update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "RaffleTemplate" WHERE id = ${id}`;
}
