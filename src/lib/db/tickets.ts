import { getSql } from "./neon";
import type { Ticket, Bank, PaymentMethod } from "../db-types";

export async function findById(id: string): Promise<Ticket | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "Ticket" WHERE id = ${id}`;
  return (rows[0] as Ticket) ?? null;
}

export async function findMany(params: {
  where?: { raffleId?: string; userId?: string; status?: string; statusIn?: string[]; paymentMobileRef?: string; paymentMobileBank?: Bank; purchasedAtGte?: Date; purchasedAtLte?: Date };
  take?: number;
  skip?: number;
}): Promise<Ticket[]> {
  const sql = getSql();
  const take = params.take ?? 1000;
  const skip = params.skip ?? 0;
  const statusIn = params.where?.statusIn;
  if (params.where?.raffleId && params.where?.userId && statusIn?.length) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "raffleId" = ${params.where.raffleId} AND "userId" = ${params.where.userId} AND status = ANY(${statusIn}) ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.raffleId && params.where?.userId) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "raffleId" = ${params.where.raffleId} AND "userId" = ${params.where.userId} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.raffleId) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "raffleId" = ${params.where.raffleId} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.userId) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "userId" = ${params.where.userId} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.statusIn?.length && params.where?.purchasedAtGte != null && params.where?.purchasedAtLte != null) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE status = ANY(${params.where.statusIn}) AND "purchasedAt" >= ${params.where.purchasedAtGte} AND "purchasedAt" <= ${params.where.purchasedAtLte} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.status && params.where?.purchasedAtGte != null && params.where?.purchasedAtLte != null) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE status = ${params.where.status} AND "purchasedAt" >= ${params.where.purchasedAtGte} AND "purchasedAt" <= ${params.where.purchasedAtLte} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.status) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE status = ${params.where.status} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  if (params.where?.paymentMobileRef && params.where?.paymentMobileBank) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "paymentMobileRef" = ${params.where.paymentMobileRef} AND "paymentMobileBank" = ${params.where.paymentMobileBank} ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Ticket[];
  }
  const rows = await sql`SELECT * FROM "Ticket" ORDER BY "purchasedAt" DESC LIMIT ${take} OFFSET ${skip}`;
  return rows as Ticket[];
}

export async function findManyByIds(ids: string[]): Promise<Ticket[]> {
  if (ids.length === 0) return [];
  const sql = getSql();
  const rows = await sql`SELECT * FROM "Ticket" WHERE id = ANY(${ids})`;
  return rows as Ticket[];
}

export async function findFirst(where: { raffleId: string; userId: string; paymentMobileRef?: string; paymentMobileBank?: Bank }): Promise<Ticket | null> {
  const sql = getSql();
  if (where.paymentMobileRef !== undefined && where.paymentMobileBank !== undefined) {
    const rows = await sql`SELECT * FROM "Ticket" WHERE "raffleId" = ${where.raffleId} AND "userId" = ${where.userId} AND "paymentMobileRef" = ${where.paymentMobileRef} AND "paymentMobileBank" = ${where.paymentMobileBank} LIMIT 1`;
    return (rows[0] as Ticket) ?? null;
  }
  const rows = await sql`SELECT * FROM "Ticket" WHERE "raffleId" = ${where.raffleId} AND "userId" = ${where.userId} LIMIT 1`;
  return (rows[0] as Ticket) ?? null;
}

/** Count CONFIRMED tickets per raffle (for admin history) */
export async function countByRaffle(raffleIds: string[]): Promise<Record<string, number>> {
  if (raffleIds.length === 0) return {};
  const sql = getSql();
  const rows = await sql`SELECT "raffleId", COUNT(*)::int as c FROM "Ticket" WHERE "raffleId" = ANY(${raffleIds}) AND status = 'CONFIRMED' GROUP BY "raffleId"` as { raffleId: string; c: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.raffleId] = r.c;
  return out;
}

export async function count(where?: { status?: string; userId?: string }): Promise<number> {
  const sql = getSql();
  if (where?.userId !== undefined && where?.status !== undefined) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "Ticket" WHERE "userId" = ${where.userId} AND status = ${where.status}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  if (where?.userId) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "Ticket" WHERE "userId" = ${where.userId}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  if (where?.status) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "Ticket" WHERE status = ${where.status}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "Ticket"`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

/** findFirst by payment ref + bank + purchasedAt in [dayStart, dayEnd) */
export async function findFirstByPaymentRef(params: { ref: string; bank: Bank; dayStart: Date; dayEnd: Date }): Promise<Ticket | null> {
  const sql = getSql();
  const rows = await sql`
    SELECT * FROM "Ticket"
    WHERE "paymentMobileRef" = ${params.ref} AND "paymentMobileBank" = ${params.bank}
      AND "purchasedAt" >= ${params.dayStart} AND "purchasedAt" < ${params.dayEnd}
    LIMIT 1
  `;
  return (rows[0] as Ticket) ?? null;
}

export async function create(data: {
  id: string;
  raffleId: string;
  userId: string;
  items: unknown;
  totalPaid: number | string;
  status?: string;
  paymentMethod?: PaymentMethod | null;
  paymentMobileRef?: string | null;
  paymentMobileBank?: Bank | null;
}): Promise<Ticket> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "Ticket" (id, "raffleId", "userId", items, "totalPaid", "purchasedAt", status, "paymentMethod", "paymentMobileRef", "paymentMobileBank")
    VALUES (${data.id}, ${data.raffleId}, ${data.userId}, ${JSON.stringify(data.items)}, ${data.totalPaid}, ${now}, ${data.status ?? "PENDING"}, ${data.paymentMethod ?? null}, ${data.paymentMobileRef ?? null}, ${data.paymentMobileBank ?? null})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("Ticket create failed");
  return created;
}

export async function update(id: string, data: { status?: string }): Promise<Ticket> {
  const sql = getSql();
  if (data.status !== undefined) await sql`UPDATE "Ticket" SET status = ${data.status} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("Ticket update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "Ticket" WHERE id = ${id}`;
}

export async function aggregate(where: { status?: string; userId?: string }, op: "sum" | "count", field?: "totalPaid"): Promise<number> {
  const sql = getSql();
  if (op === "count") return count(where);
  if (op === "sum" && field === "totalPaid") {
    if (where.status && where.userId) {
      const rows = await sql`SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket" WHERE status = ${where.status} AND "userId" = ${where.userId}`;
      return Number((rows[0] as { s: number })?.s ?? 0);
    }
    if (where.status) {
      const rows = await sql`SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket" WHERE status = ${where.status}`;
      return Number((rows[0] as { s: number })?.s ?? 0);
    }
    const rows = await sql`SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket"`;
    return Number((rows[0] as { s: number })?.s ?? 0);
  }
  return 0;
}

/** Sum of totalPaid for CONFIRMED tickets in [purchasedAtGte, purchasedAtLte]. Pass both for date filter; omit for all-time. */
export async function sumConfirmedInDateRange(params?: { purchasedAtGte?: Date; purchasedAtLte?: Date }): Promise<number> {
  const sql = getSql();
  if (params?.purchasedAtGte != null && params?.purchasedAtLte != null) {
    const rows = await sql`
      SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket"
      WHERE status = 'CONFIRMED' AND "purchasedAt" >= ${params.purchasedAtGte} AND "purchasedAt" <= ${params.purchasedAtLte}
    `;
    return Number((rows[0] as { s: number })?.s ?? 0);
  }
  const rows = await sql`SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket" WHERE status = 'CONFIRMED'`;
  return Number((rows[0] as { s: number })?.s ?? 0);
}

/** Sum of totalPaid for CONFIRMED tickets of one raffle */
export async function sumConfirmedByRaffle(raffleId: string): Promise<number> {
  const sql = getSql();
  const rows = await sql`SELECT COALESCE(SUM("totalPaid"), 0)::float as s FROM "Ticket" WHERE "raffleId" = ${raffleId} AND status = 'CONFIRMED'`;
  return Number((rows[0] as { s: number })?.s ?? 0);
}

export async function groupBy(args: { by: string[]; where?: { status?: string }; _sum?: { totalPaid?: boolean } }): Promise<{ raffleId: string; _sum: { totalPaid: number } }[]> {
  const sql = getSql();
  if (args.where?.status) {
    const rows = await sql`SELECT "raffleId", SUM("totalPaid")::float as "totalPaid" FROM "Ticket" WHERE status = ${args.where.status} GROUP BY "raffleId"`;
    return (rows as { raffleId: string; totalPaid: number }[]).map((r) => ({ raffleId: r.raffleId, _sum: { totalPaid: r.totalPaid } }));
  }
  const rows = await sql`SELECT "raffleId", SUM("totalPaid")::float as "totalPaid" FROM "Ticket" GROUP BY "raffleId"`;
  return (rows as { raffleId: string; totalPaid: number }[]).map((r) => ({ raffleId: r.raffleId, _sum: { totalPaid: r.totalPaid } }));
}
