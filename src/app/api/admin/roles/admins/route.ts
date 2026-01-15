import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Obtener todos los administradores (AGENT, SUPERADMIN, MASTER)
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const roleFilter = searchParams.get("role"); // AGENT, SUPERADMIN, MASTER

    const where: any = {
      role: { in: [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER] }
    };

    const validRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (roleFilter && validRoles.includes(roleFilter as Role)) {
      where.role = roleFilter as Role;
    }

    const admins = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        suspended: true,
        createdAt: true,
        updatedAt: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(admins);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener administradores:", err);
    return NextResponse.json({ error: "Error al obtener administradores" }, { status: 500 });
  }
}

// Crear nuevo administrador
export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const body = await request.json();
    const { name, email, password, username, role } = body;

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: "Datos incompletos" }, { status: 400 });
    }

    // Validar que el rol sea válido (no permitir crear MASTER desde API)
    const validRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN];
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
    }

    // No permitir crear MASTER desde la API (solo manualmente)
    if (role === Role.MASTER) {
      return NextResponse.json({ error: "No se pueden crear administradores MASTER desde esta interfaz" }, { status: 403 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 400 });
    }

    // Verificar username único si se proporciona
    if (username) {
      const existingUsername = await prisma.user.findUnique({ where: { username: username.toLowerCase().trim() } });
      if (existingUsername) {
        return NextResponse.json({ error: "Nombre de usuario ya está en uso" }, { status: 400 });
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        username: username ? username.toLowerCase().trim() : null,
        passwordHash,
        role: role as Role,
        birthDate: new Date("1980-01-01"), // Fecha por defecto para administradores
        createdById: auth.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: `CREATE_${role}`,
        entity: "User",
        entityId: admin.id,
        meta: { email, name, role, username: admin.username }
      }
    });

    return NextResponse.json({ 
      id: admin.id, 
      name: admin.name, 
      email: admin.email,
      username: admin.username,
      role: admin.role
    }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al crear administrador:", err);
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
  }
}
