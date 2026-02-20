import { NextResponse } from "next/server";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { users, twoFactorAuth, auditLog } from "../../../../lib/db";
import { newId } from "../../../../lib/id";
import { loginSchema } from "../../../../lib/validators";
import { logger } from "../../../../lib/logger";
import type { Role } from "../../../../lib/db-types";

const ADMIN_ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

// Fallo rápido en desarrollo (npm run dev) si falta JWT_SECRET; en build (NODE_ENV=production) no se lanza
if (process.env.NODE_ENV === "development" && !process.env.JWT_SECRET) {
  throw new Error("CRITICAL: JWT_SECRET is not defined in login route");
}
const JWT_SECRET = process.env.JWT_SECRET || "";

export async function POST(request: Request) {
  if (!JWT_SECRET) {
    return NextResponse.json(
      { error: "Configuración del servidor incompleta (JWT_SECRET)" },
      { status: 500 }
    );
  }
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
    const emailLower = email.trim().toLowerCase();
    const user = await users.findByEmailIgnoreCase(emailLower);
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

    const twoFactor = await twoFactorAuth.findUnique({ userId: user.id });
    const isAdmin = ADMIN_ROLES.includes(user.role);
    if (isAdmin && twoFactor?.enabled) {
      // Generar token temporal para 2FA (válido por 5 minutos). node:crypto es compatible en Node/Next.
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

    const JWT_EXPIRES_IN = "12h"; // Debe coincidir con la validación en auth.ts (jwt.verify rechaza tokens expirados)
    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    
    if (isAdmin) {
      try {
        const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
        await auditLog.create({
          id: newId(),
          actorId: user.id,
          actorRole: user.role,
          action: "LOGIN",
          entity: "User",
          entityId: user.id,
          ip,
          meta: { email: user.email, status: "ACTIVE" }
        });
      } catch (logError) {
        // Si falla el log, no afectar el login
        logger.error("Error al registrar log de login", { error: logError instanceof Error ? logError.message : String(logError) });
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
      secure: process.env.NODE_ENV === "production",
      // Sin domain para que use el host actual (localhost / producción)
    });
    
    return res;
  } catch (error) {
    logger.error("Error en login", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

