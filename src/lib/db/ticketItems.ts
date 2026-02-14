import { getSql } from "./neon";
import type { TicketItem, TicketItemStatus } from "../db-types";

export async function findById(id: string): Promise<TicketItem | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "TicketItem" WHERE id = ${id}`;
  return (rows[0] as TicketItem) ?? null;
}

export async function findMany(where: { ticketId?: string; raffleId?: string; raffleIds?: string[]; status?: TicketItemStatus }): Promise<TicketItem[]> {
  const sql = getSql();
  if (where.ticketId) {
    const rows = await sql`SELECT * FROM "TicketItem" WHERE "ticketId" = ${where.ticketId}`;
    return rows as TicketItem[];
  }
  if (where.raffleIds?.length) {
    const rows = await sql`SELECT * FROM "TicketItem" WHERE "raffleId" = ANY(${where.raffleIds})`;
    return rows as TicketItem[];
  }
  if (where.raffleId) {
    const rows = await sql`SELECT * FROM "TicketItem" WHERE "raffleId" = ${where.raffleId}`;
    return rows as TicketItem[];
  }
  if (where.status) {
    const rows = await sql`SELECT * FROM "TicketItem" WHERE status = ${where.status}`;
    return rows as TicketItem[];
  }
  const rows = await sql`SELECT * FROM "TicketItem"`;
  return rows as TicketItem[];
}

export async function count(where?: { status?: TicketItemStatus }): Promise<number> {
  const sql = getSql();
  if (where?.status) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "TicketItem" WHERE status = ${where.status}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "TicketItem"`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function create(data: { id: string; raffleId: string; ticketId: string; value: string; status?: TicketItemStatus }): Promise<TicketItem> {
  const sql = getSql();
  await sql`
    INSERT INTO "TicketItem" (id, "raffleId", "ticketId", value, status)
    VALUES (${data.id}, ${data.raffleId}, ${data.ticketId}, ${data.value}, ${data.status ?? "PENDING"})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("TicketItem create failed");
  return created;
}

export async function createMany(data: { id: string; raffleId: string; ticketId: string; value: string; status?: TicketItemStatus }[]): Promise<void> {
  const sql = getSql();
  for (const row of data) {
    await sql`
      INSERT INTO "TicketItem" (id, "raffleId", "ticketId", value, status)
      VALUES (${row.id}, ${row.raffleId}, ${row.ticketId}, ${row.value}, ${row.status ?? "PENDING"})
    `;
  }
}

export async function update(id: string, data: { status: TicketItemStatus }): Promise<TicketItem> {
  const sql = getSql();
  await sql`UPDATE "TicketItem" SET status = ${data.status} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("TicketItem update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "TicketItem" WHERE id = ${id}`;
}

/** Cuenta por raffleId para una lista de raffles y un status. Útil para stats. */
export async function countByRaffle(raffleIds: string[], status: TicketItemStatus): Promise<Record<string, number>> {
  if (raffleIds.length === 0) return {};
  const sql = getSql();
  const rows = await sql`SELECT "raffleId", COUNT(*)::int as c FROM "TicketItem" WHERE "raffleId" = ANY(${raffleIds}) AND status = ${status} GROUP BY "raffleId"` as { raffleId: string; c: number }[];
  const out: Record<string, number> = {};
  for (const r of rows) out[r.raffleId] = r.c;
  return out;
}

/** Cuenta items por raffleId con status en la lista (ej. PENDING+CONFIRMED para "no rechazados") */
export async function countByRaffleStatusIn(raffleId: string, statusIn: TicketItemStatus[]): Promise<number> {
  if (statusIn.length === 0) return 0;
  const sql = getSql();
  const rows = await sql`SELECT COUNT(*)::int as c FROM "TicketItem" WHERE "raffleId" = ${raffleId} AND status = ANY(${statusIn})`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

/** Items de un raffle con value en la lista (para detectar conflictos en compra) */
export async function findManyByRaffleAndValues(raffleId: string, values: string[], statusFilter: "CONFIRMED" | "not_REJECTED"): Promise<TicketItem[]> {
  const sql = getSql();
  if (statusFilter === "CONFIRMED") {
    const rows = await sql`SELECT * FROM "TicketItem" WHERE "raffleId" = ${raffleId} AND value = ANY(${values}) AND status = 'CONFIRMED'`;
    return rows as TicketItem[];
  }
  const rows = await sql`SELECT * FROM "TicketItem" WHERE "raffleId" = ${raffleId} AND value = ANY(${values}) AND status != 'REJECTED'`;
  return rows as TicketItem[];
}
