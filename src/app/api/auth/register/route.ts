import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../lib/prisma";
import { registerSchema } from "../../../../lib/validators";
import { sendEmailVerificationEmail } from "../../../../lib/email";
import crypto from "crypto";
import { getCountryFromIP } from "../../../../lib/geolocation";

export async function POST(request: Request) {
  const body = await request.json();
  
  // Obtener IP para geolocalización
  const headersList = request.headers;
  const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
  const parsed = registerSchema.safeParse(body);

  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors;
    const errorMessage = Object.values(errors).flat().join(", ");
    return NextResponse.json({ error: errorMessage || "Datos inválidos" }, { status: 400 });
  }

  const { email, password, name, username, birthDate, acceptTerms, referralCode } = parsed.data;

  // Validar edad (mayor de 18 años)
  const today = new Date();
  const birth = new Date(birthDate);
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
  
  if (actualAge < 18) {
    return NextResponse.json({ error: "Debes ser mayor de 18 años para registrarte" }, { status: 400 });
  }

  // Validar aceptación de términos
  if (!acceptTerms) {
    return NextResponse.json({ error: "Debes aceptar los términos y condiciones" }, { status: 400 });
  }

  // Verificar email único
  const existingEmail = await prisma.user.findUnique({ where: { email } });
  if (existingEmail) {
    return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
  }

  // Verificar username único
  const cleanUsername = username.trim().toLowerCase();
  const existingUsername = await prisma.user.findUnique({ where: { username: cleanUsername } });
  if (existingUsername) {
    return NextResponse.json({ error: "Este nombre de usuario ya está en uso. Por favor, elige otro." }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

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
      birthDate: new Date(birthDate),
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

  return NextResponse.json({ 
    id: user.id, 
    email: user.email,
    message: "Registro exitoso. Por favor verifica tu email." 
  }, { status: 201 });
}

