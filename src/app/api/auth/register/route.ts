import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { registerSchema } from "../../../../lib/validators";
import { sendEmailVerificationEmail } from "../../../../lib/email";
import crypto from "crypto";
import { getCountryFromIP } from "../../../../lib/geolocation";

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Obtener IP para geolocalización
    const headersList = request.headers;
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const errorMessage = Object.values(errors).flat().join(", ");
      console.error("Error de validación en registro:", errors);
      return NextResponse.json({ error: errorMessage || "Datos inválidos" }, { status: 400 });
    }

  const { email, password, name, username, documentId, acceptTerms, referralCode } = parsed.data;

  // Validar aceptación de términos
  if (!acceptTerms) {
    return NextResponse.json({ error: "Debes aceptar los términos y condiciones" }, { status: 400 });
  }

  // Validaciones estrictas de unicidad
  const cleanUsername = username.trim().toLowerCase();
  const cleanDocumentId = documentId.trim();

  // Verificar email único
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  }

  // Verificar username único
  const existingUsername = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "Este nombre de usuario ya está en uso. Por favor, elige otro." }, { status: 409 });
  }

  // Verificar documentId único
  const existingDocumentId = await prisma.user.findUnique({ where: { documentId: cleanDocumentId } });
  if (existingDocumentId) {
    return NextResponse.json({ error: "Este ID ya está registrado" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  // Extraer tipo y número del documentId (formato: "V-12345678" o "E-12345678")
  let nationalIdType: "V" | "E" = "V";
  let nationalId: string = "";
  
  if (cleanDocumentId.includes("-")) {
    const parts = cleanDocumentId.split("-");
    if (parts.length >= 2) {
      nationalIdType = (parts[0] === "E" ? "E" : "V") as "V" | "E";
      nationalId = parts.slice(1).join(""); // En caso de que haya más de un guión
    } else {
      nationalId = cleanDocumentId;
    }
  } else {
    // Si no tiene guión, asumir que es solo el número y tipo V por defecto
    nationalId = cleanDocumentId;
  }

  // Buscar link de referido si existe
  let referralLinkId: string | null = null;
  if (referralCode) {
    const referralLink = await prisma.referralLink.findUnique({
      where: { code: referralCode }
    });
    if (referralLink) {
      referralLinkId = referralLink.id;
    }
  }

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      username: cleanUsername,
      documentId: cleanDocumentId,
      nationalId: nationalId, // Guardar solo el número
      nationalIdType: nationalIdType, // Guardar el tipo (V o E)
      role: "USER"
    }
  });

  // Si hay link de referido, actualizar la visita y contadores
  if (referralLinkId) {
    // Obtener país por geolocalización (no bloquea si falla)
    let country: string | null = null;
    if (ip) {
      try {
        const countryResult = await getCountryFromIP(ip);
        if (countryResult && countryResult !== "N/A") {
          country = countryResult;
        }
      } catch (geoError) {
        // Silenciar errores de geolocalización
        console.warn("Error en geolocalización durante registro (no crítico):", geoError);
      }
    }

    // Buscar la última visita sin usuario asociado para este link
    const lastVisit = await prisma.referralVisit.findFirst({
      where: {
        referralLinkId,
        userId: null,
        registered: false
      },
      orderBy: { createdAt: "desc" }
    });

    if (lastVisit) {
      // Actualizar la visita con el usuario y marcar como registrado
      await prisma.referralVisit.update({
        where: { id: lastVisit.id },
        data: {
          userId: user.id,
          registered: true,
          // Actualizar país si no estaba establecido
          ...(country && !lastVisit.country ? { country } : {})
        }
      });
    } else {
      // Crear nueva visita si no existe
      await prisma.referralVisit.create({
        data: {
          referralLinkId,
          userId: user.id,
          registered: true,
          ip: ip || null,
          country
        }
      });
    }

    // Actualizar contadores del link
    await prisma.referralLink.update({
      where: { id: referralLinkId },
      data: {
        registrations: { increment: 1 }
      }
    });
  }

  // Crear token de verificación de email
  const verificationToken = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24); // Expira en 24 horas

  await prisma.emailVerificationToken.create({
    data: {
      userId: user.id,
      token: verificationToken,
      expiresAt,
    },
  });

  // Enviar email de verificación
  await sendEmailVerificationEmail(user.email, verificationToken);

  // Crear notificación de bienvenida
  await prisma.notification.create({
    data: {
      userId: user.id,
      type: "SYSTEM",
      title: "¡Bienvenido a LuckyLY!",
      message: `Hola ${name}, gracias por registrarte en LuckyLY. Estamos emocionados de tenerte con nosotros. No olvides verificar tu email para activar tu cuenta.`,
      read: false
    }
  });

    return NextResponse.json({ 
      id: user.id, 
      email: user.email,
      message: "Registro exitoso. Por favor verifica tu email." 
    }, { status: 201 });
  } catch (error) {
    console.error("Error en registro:", error);
    
    // Si es un error de Prisma, dar un mensaje más amigable
    if (error && typeof error === 'object' && 'code' in error) {
      const prismaError = error as { code: string; meta?: any };
      
      if (prismaError.code === 'P2002') {
        // Violación de constraint único
        const target = prismaError.meta?.target;
        if (Array.isArray(target)) {
          if (target.includes('email')) {
            return NextResponse.json({ error: "Este correo ya está registrado" }, { status: 409 });
          }
          if (target.includes('username')) {
            return NextResponse.json({ error: "Este nombre de usuario ya está en uso" }, { status: 409 });
          }
          if (target.includes('documentId')) {
            return NextResponse.json({ error: "Este ID ya está registrado" }, { status: 409 });
          }
        }
        return NextResponse.json({ error: "Los datos proporcionados ya están en uso" }, { status: 409 });
      }
      
      if (prismaError.code === 'P2022') {
        return NextResponse.json({ error: "Error de base de datos. Por favor contacta al administrador." }, { status: 500 });
      }
    }
    
    // Error genérico
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

