import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { users, referralLink, referralVisit } from "../../../../lib/db";
import { registerSchema } from "../../../../lib/validators";
import { newId } from "../../../../lib/id";
import { getCountryFromIP } from "../../../../lib/geolocation";
import { logger } from "../../../../lib/logger";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const headersList = request.headers;
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || null;
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      const errors = parsed.error.flatten().fieldErrors;
      const errorMessage = Object.values(errors).flat().join(", ");
      logger.error("Error de validación en registro", { errors: Object.keys(errors) });
      return NextResponse.json({ error: errorMessage || "Datos inválidos" }, { status: 400 });
    }

    const { email, password, name, username, documentId, acceptTerms, referralCode } = parsed.data;

    if (!acceptTerms) {
      return NextResponse.json({ error: "Debes aceptar los términos y condiciones" }, { status: 400 });
    }

    const emailLower = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();
    const cleanDocumentId = documentId.trim();

    const existingEmail = await users.findByEmailIgnoreCase(emailLower);
    if (existingEmail) {
      return NextResponse.json({ error: "Email ya registrado" }, { status: 409 });
    }

    const existingUsername = await users.findByUsername(cleanUsername);
    if (existingUsername) {
      return NextResponse.json({ error: "Este nombre de usuario ya está en uso. Por favor, elige otro." }, { status: 409 });
    }

    const existingDocumentId = await users.findByDocumentId(cleanDocumentId);
    if (existingDocumentId) {
      return NextResponse.json({ error: "Este ID ya está registrado" }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    let nationalIdType: "V" | "E" = "V";
    let nationalId = "";

    if (cleanDocumentId.includes("-")) {
      const parts = cleanDocumentId.split("-");
      if (parts.length >= 2) {
        nationalIdType = (parts[0] === "E" ? "E" : "V") as "V" | "E";
        nationalId = parts.slice(1).join("");
      } else {
        nationalId = cleanDocumentId;
      }
    } else {
      nationalId = cleanDocumentId;
    }

    let referralLinkId: string | null = null;
    if (referralCode) {
      const link = await referralLink.findUnique({ code: referralCode });
      if (link) referralLinkId = link.id;
    }

    const user = await users.create({
      id: newId(),
      email: emailLower,
      passwordHash,
      name,
      username: cleanUsername,
      documentId: cleanDocumentId,
      nationalId,
      nationalIdType,
      role: "USER",
      emailVerified: true,
      emailVerifiedAt: new Date(),
    });

    if (referralLinkId) {
      let country: string | null = null;
      if (ip) {
        try {
          const countryResult = await getCountryFromIP(ip);
          if (countryResult && countryResult !== "N/A") country = countryResult;
        } catch (geoError) {
          logger.warn("Error en geolocalización durante registro (no crítico)", { error: geoError instanceof Error ? geoError.message : String(geoError) });
        }
      }

      const lastVisit = await referralVisit.findFirst({
        where: { referralLinkId, userId: null, registered: false },
        orderBy: { createdAt: "desc" },
      });

      if (lastVisit) {
        await referralVisit.update(lastVisit.id, {
          userId: user.id,
          registered: true,
          country: country && !lastVisit.country ? country : undefined,
        });
      } else {
        await referralVisit.create({
          id: newId(),
          referralLinkId,
          userId: user.id,
          registered: true,
          ip: ip || null,
          country: country ?? undefined,
        });
      }

      const link = await referralLink.findById(referralLinkId);
      if (link) {
        await referralLink.update(link.id, { registrations: (link.registrations ?? 0) + 1 });
      }
    }

    return NextResponse.json(
      { id: user.id, email: user.email, message: "Registro exitoso." },
      { status: 201 }
    );
  } catch (error) {
    logger.error("Error en registro", { error: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : "Error interno del servidor";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
