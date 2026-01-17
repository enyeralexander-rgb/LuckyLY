import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../../../lib/prisma";
import { loginSchema } from "../../../../lib/validators";
import { Role } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "insecure-secret";

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
    console.log("🔐 Intentando login con email:", email);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log("❌ Usuario no encontrado:", email);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    console.log("✅ Usuario encontrado:", { id: user.id, email: user.email, role: user.role });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      console.log("❌ Password incorrecto para usuario:", email);
      return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
    }

    console.log("✅ Login exitoso para:", email, "Role:", user.role);

    const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "12h" });
    
    // Registrar log de inicio de sesión para administradores
    if (user.role === Role.AGENT || user.role === Role.SUPERADMIN || user.role === Role.MASTER) {
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

