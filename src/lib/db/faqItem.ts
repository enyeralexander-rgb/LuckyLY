import { getSql } from "./neon";
import type { FaqItem } from "../db-types";

export async function findMany(): Promise<FaqItem[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "FaqItem" ORDER BY "order" ASC, "createdAt" ASC`;
  return rows as FaqItem[];
}

export async function findManyActive(): Promise<FaqItem[]> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "FaqItem" WHERE active = true ORDER BY "order" ASC, "createdAt" ASC`;
  return rows as FaqItem[];
}

export async function findById(id: string): Promise<FaqItem | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "FaqItem" WHERE id = ${id}`;
  return (rows[0] as FaqItem) ?? null;
}

export async function create(data: {
  id: string;
  question: string;
  answer: string;
  order?: number;
  updatedById?: string | null;
}): Promise<FaqItem> {
  const sql = getSql();
  const now = new Date();
  const order = data.order ?? 0;
  await sql`
    INSERT INTO "FaqItem" (id, question, answer, "order", active, "createdAt", "updatedAt", "updatedById")
    VALUES (${data.id}, ${data.question}, ${data.answer}, ${order}, true, ${now}, ${now}, ${data.updatedById ?? null})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("FaqItem create failed");
  return created;
}

export async function update(id: string, data: {
  question?: string;
  answer?: string;
  order?: number;
  active?: boolean;
  updatedById?: string | null;
}): Promise<FaqItem> {
  const sql = getSql();
  const now = new Date();
  if (data.question !== undefined) await sql`UPDATE "FaqItem" SET question = ${data.question}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.answer !== undefined) await sql`UPDATE "FaqItem" SET answer = ${data.answer}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.order !== undefined) await sql`UPDATE "FaqItem" SET "order" = ${data.order}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.active !== undefined) await sql`UPDATE "FaqItem" SET active = ${data.active}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.updatedById !== undefined) await sql`UPDATE "FaqItem" SET "updatedById" = ${data.updatedById}, "updatedAt" = ${now} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("FaqItem update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "FaqItem" WHERE id = ${id}`;
}

export async function reorder(ids: string[]): Promise<void> {
  const sql = getSql();
  const now = new Date();
  for (let i = 0; i < ids.length; i++) {
    await sql`UPDATE "FaqItem" SET "order" = ${i}, "updatedAt" = ${now} WHERE id = ${ids[i]}`;
  }
}
