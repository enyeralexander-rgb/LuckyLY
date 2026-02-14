import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import bcrypt from "bcryptjs";
import { newId } from "../../../../../lib/id";
import type { Role } from "../../../../../lib/db-types";

export async function GET(request: Request) {
  try {
    requireAuth(request, ["MASTER"] as Role[]);
    const superadmins = await db.users.findMany({
      where: { role: "SUPERADMIN" },
      orderBy: { createdAt: "desc" },
    });
    const result = superadmins.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      createdAt: u.createdAt,
      role: u.role,
    }));
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener superadmins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const { name, email, password } = await request.json();
    if (!name || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const existing = await db.users.findByEmail(email);
    if (existing) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const documentId = `SUPER-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const id = newId();
    await db.users.create({
      id,
      name,
      email,
      passwordHash,
      role: "SUPERADMIN",
      documentId,
    });
    const superadmin = await db.users.findById(id);
    if (!superadmin) {
      return NextResponse.json({ error: "Error al crear superadmin" }, { status: 500 });
    }

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "CREATE_SUPERADMIN",
      entity: "User",
      entityId: superadmin.id,
      meta: { email, name },
    });

    return NextResponse.json({ id: superadmin.id, name: superadmin.name, email: superadmin.email }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear superadmin" }, { status: 500 });
  }
}
