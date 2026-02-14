import { getSql } from "./neon";
import type { Raffle, DrawType } from "../db-types";

export async function findById(id: string): Promise<Raffle | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "Raffle" WHERE id = ${id}`;
  return (rows[0] as Raffle) ?? null;
}

export async function findMany(params?: {
  where?: { status?: string; approved?: boolean };
  orderBy?: { closesAt?: "asc" | "desc"; createdAt?: "desc" };
  take?: number;
  skip?: number;
}): Promise<Raffle[]> {
  const sql = getSql();
  const take = params?.take ?? 1000;
  const skip = params?.skip ?? 0;
  const orderCreatedDesc = params?.orderBy?.createdAt === "desc";
  if (params?.where?.approved !== undefined && orderCreatedDesc) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE approved = ${params.where.approved} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as Raffle[];
  }
  if (params?.where?.status && params?.where?.approved !== undefined) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE status = ${params.where.status} AND approved = ${params.where.approved} ORDER BY "closesAt" ASC NULLS LAST LIMIT ${take} OFFSET ${skip}`;
    return rows as Raffle[];
  }
  if (params?.where?.status) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE status = ${params.where.status} ORDER BY "closesAt" ASC NULLS LAST LIMIT ${take} OFFSET ${skip}`;
    return rows as Raffle[];
  }
  if (params?.where?.approved !== undefined) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE approved = ${params.where.approved} ORDER BY "closesAt" ASC NULLS LAST LIMIT ${take} OFFSET ${skip}`;
    return rows as Raffle[];
  }
  const rows = await sql`SELECT * FROM "Raffle" ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
  return rows as Raffle[];
}

/** Sorteos finalizados para historial (filtros por fecha y tipo) */
export async function findManyHistory(params: {
  executedAtGte?: Date;
  executedAtLte?: Date;
  type?: string;
  take?: number;
}): Promise<Raffle[]> {
  const sql = getSql();
  const take = params.take ?? 100;
  if (params.executedAtGte != null && params.executedAtLte != null && params.type) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE status = 'FINISHED' AND "executedAt" IS NOT NULL AND "executedAt" >= ${params.executedAtGte} AND "executedAt" <= ${params.executedAtLte} AND type = ${params.type} ORDER BY "executedAt" DESC LIMIT ${take}`;
    return rows as Raffle[];
  }
  if (params.executedAtGte != null && params.executedAtLte != null) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE status = 'FINISHED' AND "executedAt" IS NOT NULL AND "executedAt" >= ${params.executedAtGte} AND "executedAt" <= ${params.executedAtLte} ORDER BY "executedAt" DESC LIMIT ${take}`;
    return rows as Raffle[];
  }
  if (params.type) {
    const rows = await sql`SELECT * FROM "Raffle" WHERE status = 'FINISHED' AND "executedAt" IS NOT NULL AND type = ${params.type} ORDER BY "executedAt" DESC LIMIT ${take}`;
    return rows as Raffle[];
  }
  const rows = await sql`SELECT * FROM "Raffle" WHERE status = 'FINISHED' AND "executedAt" IS NOT NULL ORDER BY "executedAt" DESC LIMIT ${take}`;
  return rows as Raffle[];
}

export async function count(where?: { status?: string }): Promise<number> {
  const sql = getSql();
  if (where?.status) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "Raffle" WHERE status = ${where.status}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "Raffle"`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

/** Sorteos ejecutados o finalizados para resultados públicos */
export async function findManyPublicResults(params: { take: number; approvedOnly?: boolean }): Promise<Raffle[]> {
  const sql = getSql();
  const { take, approvedOnly } = params;
  if (approvedOnly) {
    const rows = await sql`
      SELECT id, title, type, status, approved, "executedAt", "winningItem", prizes, "winnersCount"
      FROM "Raffle"
      WHERE ("executedAt" IS NOT NULL OR status = 'FINISHED' OR status = 'EXECUTED' OR status = 'COMPLETED')
        AND approved = true
      ORDER BY "executedAt" DESC NULLS LAST, "updatedAt" DESC
      LIMIT ${take}
    `;
    return rows as Raffle[];
  }
  const rows = await sql`
    SELECT id, title, type, status, approved, "executedAt", "winningItem", prizes, "winnersCount"
    FROM "Raffle"
    WHERE "executedAt" IS NOT NULL OR status = 'FINISHED' OR status = 'EXECUTED' OR status = 'COMPLETED'
    ORDER BY "executedAt" DESC NULLS LAST, "updatedAt" DESC
    LIMIT ${take}
  `;
  return rows as Raffle[];
}

export async function create(data: {
  id: string;
  title: string;
  description?: string | null;
  type: DrawType;
  pricePerSlot: number | string;
  slots: number;
  winnersCount?: number;
  mirrorMode?: boolean;
  status?: string;
  approved?: boolean;
  prizes?: unknown;
  templateId?: string | null;
  autoExecute?: boolean;
  createdById?: string | null;
  startsAt?: Date | null;
  closesAt?: Date | null;
}): Promise<Raffle> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "Raffle" (id, title, description, type, "pricePerSlot", slots, "winnersCount", "mirrorMode", status, approved, prizes, "templateId", "autoExecute", "createdById", "startsAt", "closesAt", "createdAt", "updatedAt")
    VALUES (${data.id}, ${data.title}, ${data.description ?? null}, ${data.type}, ${data.pricePerSlot}, ${data.slots}, ${data.winnersCount ?? 1}, ${data.mirrorMode ?? false}, ${data.status ?? "ACTIVE"}, ${data.approved ?? false}, ${data.prizes ? JSON.stringify(data.prizes) : null}, ${data.templateId ?? null}, ${data.autoExecute ?? false}, ${data.createdById ?? null}, ${data.startsAt ?? null}, ${data.closesAt ?? null}, ${now}, ${now})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("Raffle create failed");
  return created;
}

export async function update(id: string, data: { approved?: boolean; approvedAt?: Date | null; approvedById?: string | null; status?: string; executedAt?: Date | null; winningItem?: string | null }): Promise<Raffle> {
  const sql = getSql();
  const now = new Date();
  if (data.approved !== undefined) await sql`UPDATE "Raffle" SET approved = ${data.approved}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.approvedAt !== undefined) await sql`UPDATE "Raffle" SET "approvedAt" = ${data.approvedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.approvedById !== undefined) await sql`UPDATE "Raffle" SET "approvedById" = ${data.approvedById}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.status !== undefined) await sql`UPDATE "Raffle" SET status = ${data.status}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.executedAt !== undefined) await sql`UPDATE "Raffle" SET "executedAt" = ${data.executedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.winningItem !== undefined) await sql`UPDATE "Raffle" SET "winningItem" = ${data.winningItem}, "updatedAt" = ${now} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("Raffle update failed");
  return updated;
}
