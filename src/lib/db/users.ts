import { getSql } from "./neon";
import type { User, Role, Bank } from "../db-types";

export async function findById(id: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "User" WHERE id = ${id}`;
  return (rows[0] as User) ?? null;
}

export async function findByEmail(email: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "User" WHERE email = ${email}`;
  return (rows[0] as User) ?? null;
}

/** Busca usuario por email ignorando mayúsculas/minúsculas (para login y comprobaciones). */
export async function findByEmailIgnoreCase(email: string): Promise<User | null> {
  const sql = getSql();
  const lower = email.trim().toLowerCase();
  const rows = await sql`SELECT * FROM "User" WHERE LOWER(email) = ${lower}`;
  return (rows[0] as User) ?? null;
}

export async function findByUsername(username: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "User" WHERE username = ${username}`;
  return (rows[0] as User) ?? null;
}

export async function findByDocumentId(documentId: string): Promise<User | null> {
  const sql = getSql();
  const rows = await sql`SELECT * FROM "User" WHERE "documentId" = ${documentId}`;
  return (rows[0] as User) ?? null;
}

export async function findManyByIds(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];
  const sql = getSql();
  const rows = await sql`SELECT * FROM "User" WHERE id = ANY(${ids})`;
  return rows as User[];
}

export async function findMany(params: {
  where?: { role?: Role; roleIn?: Role[]; suspended?: boolean };
  skip?: number;
  take?: number;
  orderBy?: { createdAt?: "asc" | "desc" };
}): Promise<User[]> {
  const sql = getSql();
  const limit = params.take ?? 1000;
  const offset = params.skip ?? 0;
  const orderDesc = params.orderBy?.createdAt === "desc";
  let rows: User[];
  if (params.where?.roleIn?.length) {
    rows = orderDesc
      ? await sql`SELECT * FROM "User" WHERE role = ANY(${params.where.roleIn}) ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}` as User[]
      : await sql`SELECT * FROM "User" WHERE role = ANY(${params.where.roleIn}) ORDER BY "createdAt" ASC LIMIT ${limit} OFFSET ${offset}` as User[];
  } else if (params.where?.role !== undefined && params.where?.suspended !== undefined) {
    rows = orderDesc
      ? await sql`SELECT * FROM "User" WHERE role = ${params.where.role} AND suspended = ${params.where.suspended} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}` as User[]
      : await sql`SELECT * FROM "User" WHERE role = ${params.where.role} AND suspended = ${params.where.suspended} ORDER BY "createdAt" ASC LIMIT ${limit} OFFSET ${offset}` as User[];
  } else if (params.where?.role !== undefined) {
    rows = orderDesc
      ? await sql`SELECT * FROM "User" WHERE role = ${params.where.role} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}` as User[]
      : await sql`SELECT * FROM "User" WHERE role = ${params.where.role} ORDER BY "createdAt" ASC LIMIT ${limit} OFFSET ${offset}` as User[];
  } else if (params.where?.suspended !== undefined) {
    rows = orderDesc
      ? await sql`SELECT * FROM "User" WHERE suspended = ${params.where.suspended} ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}` as User[]
      : await sql`SELECT * FROM "User" WHERE suspended = ${params.where.suspended} ORDER BY "createdAt" ASC LIMIT ${limit} OFFSET ${offset}` as User[];
  } else {
    rows = orderDesc
      ? await sql`SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT ${limit} OFFSET ${offset}` as User[]
      : await sql`SELECT * FROM "User" ORDER BY "createdAt" ASC LIMIT ${limit} OFFSET ${offset}` as User[];
  }
  return Array.isArray(rows) ? rows : [];
}

export async function count(where?: { role?: Role }): Promise<number> {
  const sql = getSql();
  if (!where?.role) {
    const rows = await sql`SELECT COUNT(*)::int as c FROM "User"`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = ${where.role}`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

/** Admin list/count with search and filters (role USER) */
export async function findManyAdmin(params: {
  search?: string;
  name?: string;
  email?: string;
  nationalId?: string;
  phoneNumber?: string;
  bank?: string;
  createdAtGte?: Date;
  createdAtLte?: Date;
  userIdIn?: string[];
  skip: number;
  take: number;
}): Promise<User[]> {
  const sql = getSql();
  const { skip, take } = params;
  if (params.userIdIn && params.userIdIn.length === 0) return [];
  const andUserIdIn = params.userIdIn?.length ? sql`AND id = ANY(${params.userIdIn})` : sql``;
  const search = params.search?.trim();
  const bankValues = ["BANESCO", "VENEZUELA", "MERCANTIL", "BOD", "PROVINCIAL", "BICENTENARIO", "OTRA", "BANCO_100", "BANCAMIGA", "BANCARIBE", "BANCO_ACTIVO", "BANCO_AGRICOLA", "BANCO_CARONI", "BANFANB", "BANCO_TESORO", "BANCO_EXTERIOR", "BFC", "BANCO_INTERNACIONAL_DESARROLLO", "BNC", "BANCO_PLAZA", "BANCO_SOFITASA", "BANCRECER", "BANGENTE", "BANPLUS", "DELSUR", "MI_BANCO", "N58_BANCO_DIGITAL"];
  if (search) {
    const pattern = "%" + search.replace(/%/g, "\\%") + "%";
    const matchBank = bankValues.find((b) => b.toLowerCase().includes(search.toLowerCase()));
    if (matchBank) {
      const rows = await sql`SELECT * FROM "User" WHERE role = 'USER' ${andUserIdIn} AND (name ILIKE ${pattern} OR email ILIKE ${pattern} OR "nationalId" ILIKE ${pattern} OR "phoneNumber" ILIKE ${pattern} OR bank = ${matchBank}) ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
      return rows as User[];
    }
    const rows = await sql`SELECT * FROM "User" WHERE role = 'USER' ${andUserIdIn} AND (name ILIKE ${pattern} OR email ILIKE ${pattern} OR "nationalId" ILIKE ${pattern} OR "phoneNumber" ILIKE ${pattern}) ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as User[];
  }
  if (params.name || params.email || params.nationalId || params.phoneNumber || params.bank || params.createdAtGte != null || params.createdAtLte != null || andUserIdIn) {
    const andName = params.name ? sql`AND name ILIKE ${"%" + params.name + "%"}` : sql``;
    const andEmail = params.email ? sql`AND email ILIKE ${"%" + params.email + "%"}` : sql``;
    const andNationalId = params.nationalId ? sql`AND "nationalId" ILIKE ${"%" + params.nationalId + "%"}` : sql``;
    const andPhone = params.phoneNumber ? sql`AND "phoneNumber" ILIKE ${"%" + params.phoneNumber + "%"}` : sql``;
    const bankExact = params.bank ? bankValues.find((x) => x.toLowerCase() === params.bank!.toLowerCase()) : null;
    const andBank = bankExact ? sql`AND bank = ${bankExact}` : sql``;
    const andCreatedGte = params.createdAtGte != null ? sql`AND "createdAt" >= ${params.createdAtGte}` : sql``;
    const andCreatedLte = params.createdAtLte != null ? sql`AND "createdAt" <= ${params.createdAtLte}` : sql``;
    const rows = await sql`SELECT * FROM "User" WHERE role = 'USER' ${andUserIdIn} ${andName} ${andEmail} ${andNationalId} ${andPhone} ${andBank} ${andCreatedGte} ${andCreatedLte} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
    return rows as User[];
  }
  const rows = await sql`SELECT * FROM "User" WHERE role = 'USER' ${andUserIdIn} ORDER BY "createdAt" DESC LIMIT ${take} OFFSET ${skip}`;
  return rows as User[];
}

export async function countAdmin(params: {
  search?: string;
  name?: string;
  email?: string;
  nationalId?: string;
  phoneNumber?: string;
  bank?: string;
  createdAtGte?: Date;
  createdAtLte?: Date;
  userIdIn?: string[];
}): Promise<number> {
  const sql = getSql();
  if (params.userIdIn && params.userIdIn.length === 0) return 0;
  const andUserIdIn = params.userIdIn?.length ? sql`AND id = ANY(${params.userIdIn})` : sql``;
  const search = params.search?.trim();
  const bankValues = ["BANESCO", "VENEZUELA", "MERCANTIL", "BOD", "PROVINCIAL", "BICENTENARIO", "OTRA", "BANCO_100", "BANCAMIGA", "BANCARIBE", "BANCO_ACTIVO", "BANCO_AGRICOLA", "BANCO_CARONI", "BANFANB", "BANCO_TESORO", "BANCO_EXTERIOR", "BFC", "BANCO_INTERNACIONAL_DESARROLLO", "BNC", "BANCO_PLAZA", "BANCO_SOFITASA", "BANCRECER", "BANGENTE", "BANPLUS", "DELSUR", "MI_BANCO", "N58_BANCO_DIGITAL"];
  if (search) {
    const pattern = "%" + search.replace(/%/g, "\\%") + "%";
    const matchBank = bankValues.find((b) => b.toLowerCase().includes(search.toLowerCase()));
    if (matchBank) {
      const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = 'USER' ${andUserIdIn} AND (name ILIKE ${pattern} OR email ILIKE ${pattern} OR "nationalId" ILIKE ${pattern} OR "phoneNumber" ILIKE ${pattern} OR bank = ${matchBank})`;
      return Number((rows[0] as { c: number })?.c ?? 0);
    }
    const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = 'USER' ${andUserIdIn} AND (name ILIKE ${pattern} OR email ILIKE ${pattern} OR "nationalId" ILIKE ${pattern} OR "phoneNumber" ILIKE ${pattern})`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  if (params.name || params.email || params.nationalId || params.phoneNumber || params.bank || params.createdAtGte != null || params.createdAtLte != null || andUserIdIn) {
    const andName = params.name ? sql`AND name ILIKE ${"%" + params.name + "%"}` : sql``;
    const andEmail = params.email ? sql`AND email ILIKE ${"%" + params.email + "%"}` : sql``;
    const andNationalId = params.nationalId ? sql`AND "nationalId" ILIKE ${"%" + params.nationalId + "%"}` : sql``;
    const andPhone = params.phoneNumber ? sql`AND "phoneNumber" ILIKE ${"%" + params.phoneNumber + "%"}` : sql``;
    const bankExact = params.bank ? bankValues.find((x) => x.toLowerCase() === params.bank!.toLowerCase()) : null;
    const andBank = bankExact ? sql`AND bank = ${bankExact}` : sql``;
    const andCreatedGte = params.createdAtGte != null ? sql`AND "createdAt" >= ${params.createdAtGte}` : sql``;
    const andCreatedLte = params.createdAtLte != null ? sql`AND "createdAt" <= ${params.createdAtLte}` : sql``;
    const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = 'USER' ${andUserIdIn} ${andName} ${andEmail} ${andNationalId} ${andPhone} ${andBank} ${andCreatedGte} ${andCreatedLte}`;
    return Number((rows[0] as { c: number })?.c ?? 0);
  }
  const rows = await sql`SELECT COUNT(*)::int as c FROM "User" WHERE role = 'USER' ${andUserIdIn}`;
  return Number((rows[0] as { c: number })?.c ?? 0);
}

export async function create(data: {
  id: string;
  email: string;
  passwordHash: string;
  name: string;
  documentId: string;
  role?: Role;
  username?: string | null;
  nationalId?: string | null;
  nationalIdType?: string | null;
  createdById?: string | null;
  emailVerified?: boolean;
  emailVerifiedAt?: Date | null;
}): Promise<User> {
  const sql = getSql();
  const now = new Date();
  await sql`
    INSERT INTO "User" (id, email, "passwordHash", name, "documentId", "nationalId", "nationalIdType", "createdAt", "updatedAt", role, username, "createdById", "emailVerified", "emailVerifiedAt")
    VALUES (${data.id}, ${data.email}, ${data.passwordHash}, ${data.name}, ${data.documentId}, ${data.nationalId ?? null}, ${data.nationalIdType ?? null}, ${now}, ${now}, ${data.role ?? "USER"}, ${data.username ?? null}, ${data.createdById ?? null}, ${data.emailVerified ?? false}, ${data.emailVerifiedAt ?? null})
  `;
  const created = await findById(data.id);
  if (!created) throw new Error("User create failed");
  return created;
}

export async function update(
  id: string,
  data: Partial<{
    email: string;
    passwordHash: string;
    name: string;
    documentId: string;
    username: string | null;
    avatarUrl: string | null;
    nationalId: string | null;
    nationalIdType: string | null;
    phoneNumber: string | null;
    bank: Bank | null;
    bankPhone: string | null;
    bankDataUpdatedAt: Date | null;
    suspended: boolean;
    suspendedReason: string | null;
    suspendedAt: Date | null;
    emailVerified: boolean;
    emailVerifiedAt: Date | null;
    emailUpdatedAt: Date | null;
    usernameUpdatedAt: Date | null;
    role: Role;
  }>
): Promise<User> {
  const sql = getSql();
  const now = new Date();
  if (data.email !== undefined) await sql`UPDATE "User" SET email = ${data.email}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.emailUpdatedAt !== undefined) await sql`UPDATE "User" SET "emailUpdatedAt" = ${data.emailUpdatedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.usernameUpdatedAt !== undefined) await sql`UPDATE "User" SET "usernameUpdatedAt" = ${data.usernameUpdatedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.passwordHash !== undefined) await sql`UPDATE "User" SET "passwordHash" = ${data.passwordHash}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.name !== undefined) await sql`UPDATE "User" SET name = ${data.name}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.documentId !== undefined) await sql`UPDATE "User" SET "documentId" = ${data.documentId}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.username !== undefined) await sql`UPDATE "User" SET username = ${data.username}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.avatarUrl !== undefined) await sql`UPDATE "User" SET "avatarUrl" = ${data.avatarUrl}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.nationalId !== undefined) await sql`UPDATE "User" SET "nationalId" = ${data.nationalId}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.nationalIdType !== undefined) await sql`UPDATE "User" SET "nationalIdType" = ${data.nationalIdType}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.phoneNumber !== undefined) await sql`UPDATE "User" SET "phoneNumber" = ${data.phoneNumber}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.bank !== undefined) await sql`UPDATE "User" SET bank = (${data.bank})::"Bank", "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.bankPhone !== undefined) await sql`UPDATE "User" SET "bankPhone" = ${data.bankPhone}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.bankDataUpdatedAt !== undefined) await sql`UPDATE "User" SET "bankDataUpdatedAt" = ${data.bankDataUpdatedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.suspended !== undefined) await sql`UPDATE "User" SET suspended = ${data.suspended}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.suspendedReason !== undefined) await sql`UPDATE "User" SET "suspendedReason" = ${data.suspendedReason}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.suspendedAt !== undefined) await sql`UPDATE "User" SET "suspendedAt" = ${data.suspendedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.emailVerified !== undefined) await sql`UPDATE "User" SET "emailVerified" = ${data.emailVerified}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.emailVerifiedAt !== undefined) await sql`UPDATE "User" SET "emailVerifiedAt" = ${data.emailVerifiedAt}, "updatedAt" = ${now} WHERE id = ${id}`;
  if (data.role !== undefined) await sql`UPDATE "User" SET role = ${data.role}, "updatedAt" = ${now} WHERE id = ${id}`;
  const updated = await findById(id);
  if (!updated) throw new Error("User update failed");
  return updated;
}

export async function deleteById(id: string): Promise<void> {
  const sql = getSql();
  await sql`DELETE FROM "User" WHERE id = ${id}`;
}
