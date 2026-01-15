import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

// Actualizar administrador (rol, nombre, email, username)
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const body = await request.json();
    const { name, email, username, role, password } = body;

    const admin = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }

    // Verificar que sea un administrador
    const adminRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (!adminRoles.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }

    // No permitir modificar MASTER
    if (admin.role === Role.MASTER && admin.id !== auth.userId) {
      return NextResponse.json({ error: "No se pueden modificar otros administradores MASTER" }, { status: 403 });
    }

    const updateData: any = {};

    if (name) updateData.name = name;
    if (email && email !== admin.email) {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email ya está en uso" }, { status: 400 });
      }
      updateData.email = email;
    }
    if (username !== undefined) {
      if (username && username.trim()) {
        const cleanUsername = username.toLowerCase().trim();
        if (cleanUsername !== admin.username) {
          const existing = await prisma.user.findUnique({ where: { username: cleanUsername } });
          if (existing) {
            return NextResponse.json({ error: "Nombre de usuario ya está en uso" }, { status: 400 });
          }
          updateData.username = cleanUsername;
        }
      } else {
        updateData.username = null;
      }
    }
    if (role && role !== admin.role) {
      // Validar que el rol sea válido
      const validRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN];
      if (!validRoles.includes(role as Role)) {
        return NextResponse.json({ error: "Rol inválido o no permitido" }, { status: 400 });
      }
      // No permitir cambiar a MASTER
      if (role === Role.MASTER) {
        return NextResponse.json({ error: "No se puede asignar el rol MASTER desde esta interfaz" }, { status: 403 });
      }
      updateData.role = role as Role;
    }
    if (password) {
      updateData.passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "UPDATE_ADMIN",
        entity: "User",
        entityId: updated.id,
        meta: { 
          previousRole: admin.role,
          newRole: updated.role,
          changes: Object.keys(updateData)
        }
      }
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar administrador:", err);
    return NextResponse.json({ error: "Error al actualizar administrador" }, { status: 500 });
  }
}

// Eliminar administrador
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    
    const admin = await prisma.user.findUnique({
      where: { id: params.id }
    });

    if (!admin) {
      return NextResponse.json({ error: "Administrador no encontrado" }, { status: 404 });
    }

    // Verificar que sea un administrador
    const adminRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    if (!adminRoles.includes(admin.role)) {
      return NextResponse.json({ error: "El usuario no es un administrador" }, { status: 400 });
    }

    // No permitir eliminar MASTER
    if (admin.role === Role.MASTER) {
      return NextResponse.json({ error: "No se pueden eliminar administradores MASTER" }, { status: 403 });
    }

    // No permitir auto-eliminación
    if (admin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta" }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: params.id }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "DELETE_ADMIN",
        entity: "User",
        entityId: params.id,
        meta: { 
          deletedEmail: admin.email,
          deletedName: admin.name,
          deletedRole: admin.role
        }
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al eliminar administrador:", err);
    return NextResponse.json({ error: "Error al eliminar administrador" }, { status: 500 });
  }
}
