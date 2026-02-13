import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
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
    logger.error("Error al obtener administradores", { error: err instanceof Error ? err.message : String(err) });
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

    // Validar que el rol sea válido (ahora permitir crear MASTER)
    const validRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (!validRoles.includes(role as Role)) {
      return NextResponse.json({ error: "Rol inválido" }, { status: 400 });
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
    // Generar documentId único para administradores
    const documentId = `ADMIN-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    
    const admin = await prisma.user.create({
      data: {
        name,
        email,
        username: username ? username.toLowerCase().trim() : null,
        passwordHash,
        role: role as Role,
        documentId,
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
    logger.error("Error al crear administrador", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al crear administrador" }, { status: 500 });
  }
}
