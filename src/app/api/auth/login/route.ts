import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";
import { loginSchema } from "../../../../lib/validators";
import { Role } from "@prisma/client";
import crypto from "crypto";

// Helper to get secret lazily (duplicated here to avoid circular deps if auth.ts imports prisma, though it doesn't seem to)
// Actually, it's safer to just check process.env.JWT_SECRET consistent with middleware/auth
const JWT_SECRET = process.env.JWT_SECRET || "";
if (!process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET is not defined in login route");
}

export async function POST(request: Request) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json({ error: "Formato de datos inválido" }, { status: 400 });
    }
    
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessage = parsed.error.errors.length > 0 
        ? parsed.error.errors.map(e => e.message).join(", ")
        : "Datos inválidos";
      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ 
      where: { email },
      include: { twoFactorAuth: true }
    });
    if (!user) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    // Verificar si el usuario está suspendido
    if (user.suspended) {
      const reason = user.suspendedReason || "Sin motivo especificado";
      return NextResponse.json({ 
        error: `USUARIO SUSPENDIDO POR EL MOTIVO: ${reason}`,
        suspended: true,
        reason
      }, { status: 403 });
    }

    // Verificar si el administrador tiene 2FA habilitado
    const adminRoles: Role[] = [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER];
    const isAdmin = adminRoles.includes(user.role);
    if (isAdmin && user.twoFactorAuth?.enabled) {
      // Generar token temporal para 2FA (válido por 5 minutos)
      const tempToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutos
      
      // Guardar token temporal en la base de datos o en memoria
      // Usamos un token JWT corto para pasar al frontend
      const twoFactorToken = jwt.sign(
        { sub: user.id, type: "2fa_pending", role: user.role },
        JWT_SECRET,
        { expiresIn: "5m" }
      );

      return NextResponse.json({
        requires2FA: true,
        twoFactorToken,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }, { status: 200 });
    }

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    
    // Registrar log de inicio de sesión para administradores
    if (isAdmin) {
      try {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        await prisma.auditLog.create({
          data: {
            actorId: user.id,
            actorRole: user.role,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
            ip,
            meta: {
              email: user.email,
              status: "ACTIVE"
            }
          }
        });
      } catch (logError) {
        // Si falla el log, no afectar el login
        console.error("Error al registrar log de login:", logError);
      }
    }

    const res = NextResponse.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        role: user.role 
      } 
    }, { status: 200 });
    
    res.cookies.set("auth_token", token, { 
      httpOnly: true, 
      path: "/", 
      maxAge: 60 * 60 * 12,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });
    
    return res;
  } catch (error) {
    console.error("Error en login:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

