import { getSql } from "./neon";
import type { PrizeClaim, PrizeStatus } from "../db-types";

export async function findById(id: string): Promise<PrizeClaim | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "PrizeClaim" WHERE id = ${id}`;
  return (rows[0] as PrizeClaim) ?? null;
}

export async function findUnique(where: { ticketId: string }): Promise<PrizeClaim | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "PrizeClaim" WHERE "ticketId" = ${where.ticketId}`;
  return (rows[0] as PrizeClaim) ?? null;
}

export async function findMany(params?: { where?: { userId?: string; status?: PrizeStatus | PrizeStatus[]; processedAtGte?: Date; processedAtLte?: Date }; take?: number; skip?: number }): Promise<PrizeClaim[]> {
  const sql = getSql();
  const take = params?.take ?? 1000;
  const skip = params?.skip ?? 0;
  const w = params?.where;
  if (w?.status && w?.processedAtGte != null && w?.processedAtLte != null) {
    const statuses = Array.isArray(w.status) ? w.status : [w.status];
    const rows = await sql`SELECT * FROM "PrizeClaim" WHERE status = ANY(${statuses}) AND "processedAt" >= ${w.processedAtGte} AND "processedAt" <= ${w.processedAtLte} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as PrizeClaim[];
  }
  if (w?.userId && w?.status) {
    const statuses = Array.isArray(w.status) ? w.status : [w.status];
    const rows = await sql`SELECT * FROM "PrizeClaim" WHERE "userId" = ${w.userId} AND status = ANY(${statuses}) ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as PrizeClaim[];
  }
  if (w?.status) {
    const statuses = Array.isArray(w.status) ? w.status : [w.status];
    const rows = await sql`SELECT * FROM "PrizeClaim" WHERE status = ANY(${statuses}) ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as PrizeClaim[];
  }
  if (w?.userId) {
    const rows = await sql`SELECT * FROM "PrizeClaim" WHERE "userId" = ${w.userId} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as PrizeClaim[];
  }
  const rows = await sql`SELECT * FROM "PrizeClaim" ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
  return rows as PrizeClaim[];
}

export async function count(where?: { status?: PrizeStatus | PrizeStatus[] }): Promise<number> {
  const sql = getSql();
  if (where?.status) {
    const statuses = Array.isArray(where.status) ? where.status : [where.status];
    const rows = await sql`SELECT COUNT(*)::int as c FROM "PrizeClaim" WHERE status = ANY(${statuses})`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "PrizeClaim"`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function create(data: { id: string; ticketId: string; userId: string; status?: PrizeStatus }): Promise<PrizeClaim> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "PrizeClaim" (id, "ticketId", "userId", status, "createdAt")
    VALUES (${data.id}, ${data.ticketId}, ${data.userId}, ${data.status ?? "REQUESTED"}, ${now})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("PrizeClaim create failed");
  return created;
}

export async function update(id: string, data: Partial<{ status: PrizeStatus; paymentRef: string | null; paymentProof: string | null; processedAt: Date | null; processedById: string | null; paidAmount: number | string | null }>): Promise<PrizeClaim> {
  const sql = getSql();
  if (data.status !== undefined) await sql`UPDATE "PrizeClaim" SET status = ${data.status} WHERE id = ${id}`;
  if (data.paymentRef !== undefined) await sql`UPDATE "PrizeClaim" SET "paymentRef" = ${data.paymentRef} WHERE id = ${id}`;
  if (data.paymentProof !== undefined) await sql`UPDATE "PrizeClaim" SET "paymentProof" = ${data.paymentProof} WHERE id = ${id}`;
  if (data.processedAt !== undefined) await sql`UPDATE "PrizeClaim" SET "processedAt" = ${data.processedAt} WHERE id = ${id}`;
  if (data.processedById !== undefined) await sql`UPDATE "PrizeClaim" SET "processedById" = ${data.processedById} WHERE id = ${id}`;
  if (data.paidAmount !== undefined) await sql`UPDATE "PrizeClaim" SET "paidAmount" = ${data.paidAmount} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("PrizeClaim update failed");
  return updated;
}

export async function aggregate(where: { status?: PrizeStatus | PrizeStatus[]; processedAtGte?: Date; processedAtLte?: Date }, op: "sum", field: "paidAmount"): Promise<number> {
  const sql = getSql();
  if (where.status && where.processedAtGte != null && where.processedAtLte != null) {
    const statuses = Array.isArray(where.status) ? where.status : [where.status];
    const rows = await sql`SELECT COALESCE(SUM("paidAmount"), 0)::float as s FROM "PrizeClaim" WHERE status = ANY(${statuses}) AND "processedAt" >= ${where.processedAtGte} AND "processedAt" <= ${where.processedAtLte}`;
    return Number((rows[0] as { s: number })?.s ?? 0);
  }
  if (where.status) {
    const statuses = Array.isArray(where.status) ? where.status : [where.status];
    const rows = await sql`SELECT COALESCE(SUM("paidAmount"), 0)::float as s FROM "PrizeClaim" WHERE status = ANY(${statuses})`;
    return Number((rows[0] as { s: number })?.s ?? 0);
  }
  const rows = await sql`SELECT COALESCE(SUM("paidAmount"), 0)::float as s FROM "PrizeClaim"`;
  return Number((rows[0] as { s: number })?.s ?? 0);
}

/** Sum of paidAmount for PAID claims in date range */
export async function sumPaidInDateRange(processedAtGte: Date, processedAtLte: Date): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT COALESCE(SUM("paidAmount"), 0)::float as s FROM "PrizeClaim" WHERE status = 'PAID' AND "processedAt" >= ${processedAtGte} AND "processedAt" <= ${processedAtLte}`;
  return Number((rows[0] as { s: number })?.s ?? 0);
}

/** Find PAID claims for tickets of a given raffle (for getRafflePrizesPaid) */
export async function findManyPaidByRaffleId(raffleId: string): Promise<PrizeClaim[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT c.* FROM "PrizeClaim" c
    INNER JOIN "Ticket" t ON c."ticketId" = t.id
    WHERE c.status = 'PAID' AND t."raffleId" = ${raffleId}
  `;
  return rows as PrizeClaim[];
}
