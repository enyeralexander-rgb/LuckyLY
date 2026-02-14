import { getSql } from "./neon";
import type { PaymentMobile } from "../db-types";

export async function findFirst(params?: { orderBy?: { updatedAt: "desc" } }): Promise<PaymentMobile | null> {
  const sql = getSql();
  const rows = params?.orderBy?.updatedAt === "desc"
    ? await sql`SELECT * FROM "PaymentMobile" ORDER BY "updatedAt" DESC LIMIT 1`
    : await sql`SELECT * FROM "PaymentMobile" LIMIT 1`;
  return (rows[0] as PaymentMobile) ?? null;
}

export async function create(data: { id: string; imageUrl?: string | null; cedula?: string | null; telefono?: string | null; destino?: string | null; updatedById?: string | null }): Promise<PaymentMobile> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "PaymentMobile" (id, "imageUrl", cedula, telefono, destino, "updatedAt", "updatedById")
    VALUES (${data.id}, ${data.imageUrl ?? null}, ${data.cedula ?? null}, ${data.telefono ?? null}, ${data.destino ?? null}, ${now}, ${data.updatedById ?? null})
  `;
  const rows = await sql`SELECT * FROM "PaymentMobile" WHERE id = ${data.id}`;
  return rows[0] as PaymentMobile;
}

export async function update(id: string, data: Partial<{ imageUrl: string | null; cedula: string | null; telefono: string | null; destino: string | null; updatedById: string | null }>): Promise<PaymentMobile> {
  const sql = getSql();
  const now = new Date();
  if (data.imageUrl !== undefined) await sql`UPDATE "PaymentMobile" SET "imageUrl" = ${data.imageUrl}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.cedula !== undefined) await sql`UPDATE "PaymentMobile" SET cedula = ${data.cedula}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.telefono !== undefined) await sql`UPDATE "PaymentMobile" SET telefono = ${data.telefono}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.destino !== undefined) await sql`UPDATE "PaymentMobile" SET destino = ${data.destino}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.updatedById !== undefined) await sql`UPDATE "PaymentMobile" SET "updatedById" = ${data.updatedById}, "updatedAt" = ${now} WHERE id = ${id}`;
  const rows = await sql`SELECT * FROM "PaymentMobile" WHERE id = ${id}`;
  return rows[0] as PaymentMobile;
}
