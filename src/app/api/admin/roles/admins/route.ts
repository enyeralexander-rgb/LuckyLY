import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import bcrypt from "bcryptjs";
import { newId } from "../../../../../lib/id";
import type { Role } from "../../../../../lib/db-types";

const VALID_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ["MASTER"] as Role[]);
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role");

    const roleIn: Role[] = roleFilter && VALID_ROLES.includes(roleFilter as Role) ? [roleFilter as Role] : VALID_ROLES;
    const admins = await db.users.findMany({
      where: { roleIn },
      orderBy: { createdAt: "desc" },
    });

    const createdByIds = [...new Set(admins.map((a) => a.createdById).filter(Boolean))] as string[];
    const creators = createdByIds.length ? await db.users.findManyByIds(createdByIds) : [];
    const creatorMap = Object.fromEntries(creators.map((u) => [u.id, u]));

    const result = admins.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      username: a.username,
      role: a.role,
      suspended: a.suspended,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      createdBy: a.createdById && creatorMap[a.createdById] ? { id: creatorMap[a.createdById].id, name: creatorMap[a.createdById].name, email: creatorMap[a.createdById].email } : null,
    }));

    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener administradores", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener administradores" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const body = await request.json();
    const { name, email, password, username, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role as Role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    const existing = await db.users.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }
    if (username) {
      const existingUsername = await db.users.findByUsername(username.toLowerCase().trim());
      if (existingUsername) {
        return NextResponse.json({ error: "Nombre de usuario ya está en uso" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const documentId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const adminId = newId();

    await db.users.create({
      id: adminId,
      name,
      email,
      username: username ? username.toLowerCase().trim() : null,
      passwordHash,
      role: role as Role,
      documentId,
      createdById: auth.userId,
    });
    const admin = await db.users.findById(adminId);
    if (!admin) {
      return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
    }

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: `CREATE_${role}`,
      entity: "User",
      entityId: admin.id,
      meta: { email, name, role, username: admin.username },
    });

    return NextResponse.json({
      id: admin.id,
      name: admin.name,
      email: admin.email,
      username: admin.username,
      role: admin.role,
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al crear administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
  }
}
