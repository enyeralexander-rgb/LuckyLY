import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const superadmins = await prisma.user.findMany({
      where: { role: Role.SUPERADMIN },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
        role: true
      },
      orderBy: { createdAt: "desc" }
    });
    return NextResponse.json(superadmins);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener superadmins" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const { name, email, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    // Generar documentId único para superadmin
    const documentId = `SUPER-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const superadmin = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: Role.SUPERADMIN,
        documentId
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "CREATE_SUPERADMIN",
        entity: "User",
        entityId: superadmin.id,
        meta: { email, name }
      }
    });

    return NextResponse.json({ id: superadmin.id, name: superadmin.name, email: superadmin.email }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear superadmin" }, { status: 500 });
  }
}

