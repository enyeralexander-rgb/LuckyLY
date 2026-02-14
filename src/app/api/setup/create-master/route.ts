import { NextResponse } from "next/server";
import { users } from "../../../../lib/db";
import { logger } from "../../../../lib/logger";
import { newId } from "../../../../lib/id";
import bcrypt from "bcryptjs";

/**
 * Endpoint temporal para crear/actualizar el usuario MASTER
 * Solo funciona en desarrollo o con una clave secreta en producción
 * 
 * Uso: POST /api/setup/create-master
 * Body: { "secret": "YOUR_SECRET_KEY" } (opcional, solo en producción)
 */
export const dynamic = 'force-dynamic';

function normalizeSecret(value: unknown): string {
  return String(value ?? "").trim();
}

function secretMatches(provided: unknown, envSecret: string): boolean {
  return envSecret !== "" && normalizeSecret(provided) === normalizeSecret(envSecret);
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    // En producción, exigir MASTER_SETUP_SECRET definido y distinto del placeholder
    if (process.env.NODE_ENV === "production") {
      const envSecret = normalizeSecret(process.env.MASTER_SETUP_SECRET ?? "");
      if (!envSecret || envSecret === "CHANGE_THIS_IN_PRODUCTION") {
        return NextResponse.json(
          { error: "Endpoint no configurado. Defina MASTER_SETUP_SECRET en el servidor (Vercel → Project → Settings → Environment Variables)." },
          { status: 503 }
        );
      }
      const providedSecret = body.secret ?? request.headers.get("x-master-setup-secret");
      if (!secretMatches(providedSecret, envSecret)) {
        return NextResponse.json(
          { error: "No autorizado. Incluya el secreto en el body (secret) o en el header (x-master-setup-secret)." },
          { status: 401 }
        );
      }
    }

    // Credenciales: body primero, luego variables de entorno (nunca valores en código)
    const email = (body.email && String(body.email).trim()) || process.env.MASTER_INITIAL_EMAIL?.trim();
    const password = body.password != null ? String(body.password) : process.env.MASTER_INITIAL_PASSWORD;
    const documentId = (body.documentId && String(body.documentId).trim()) || process.env.MASTER_INITIAL_DOCUMENT_ID?.trim() || null;
    const name = (body.name && String(body.name).trim()) || process.env.MASTER_INITIAL_NAME?.trim() || "Administrador Master";

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Faltan email y/o contraseña.",
          hint: "Envíalos en el body (email, password) o configura MASTER_INITIAL_EMAIL y MASTER_INITIAL_PASSWORD en Vercel (Project → Settings → Environment Variables) y vuelve a llamar con solo el secret.",
        },
        { status: 400 }
      );
    }

    const finalDocumentId = documentId || `V-MASTER-${Date.now()}`;

    const existingMaster = await users.findByEmail(email);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      await users.update(existingMaster.id, {
        passwordHash,
        role: "MASTER",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        suspended: false,
        documentId: existingMaster.documentId || finalDocumentId,
        name: name || existingMaster.name
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER actualizado",
        email
      });
    } else {
      await users.create({
        id: newId(),
        email,
        passwordHash,
        name: name || "Administrador Master",
        username: "master",
        role: "MASTER",
        documentId: finalDocumentId,
        emailVerified: true,
        emailVerifiedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER creado",
        email
      });
    }
  } catch (error) {
    logger.error("Error al crear/actualizar usuario MASTER", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Error al crear/actualizar usuario MASTER" },
      { status: 500 }
    );
  }
}

// También permitir GET: credenciales por query o por env
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    if (process.env.NODE_ENV === "production") {
      const envSecret = normalizeSecret(process.env.MASTER_SETUP_SECRET ?? "");
      if (!envSecret || envSecret === "CHANGE_THIS_IN_PRODUCTION") {
        return NextResponse.json(
          { error: "Endpoint no configurado. Defina MASTER_SETUP_SECRET en el servidor (Vercel → Environment Variables)." },
          { status: 503 }
        );
      }
      const secret = url.searchParams.get("secret");
      if (!secretMatches(secret, envSecret)) {
        return NextResponse.json(
          { error: "No autorizado. Añada ?secret=TU_MASTER_SETUP_SECRET a la URL." },
          { status: 401 }
        );
      }
    }

    const email = url.searchParams.get("email")?.trim() || process.env.MASTER_INITIAL_EMAIL?.trim();
    const password = url.searchParams.get("password") ?? process.env.MASTER_INITIAL_PASSWORD;
    const documentId = url.searchParams.get("documentId")?.trim() || process.env.MASTER_INITIAL_DOCUMENT_ID?.trim() || null;
    const name = url.searchParams.get("name")?.trim() || process.env.MASTER_INITIAL_NAME?.trim() || "Administrador Master";

    if (!email || !password) {
      return NextResponse.json(
        {
          error: "Faltan email y/o contraseña.",
          hint: "Añada ?email=...&password=... a la URL o configure MASTER_INITIAL_EMAIL y MASTER_INITIAL_PASSWORD en Vercel y llame solo con ?secret=...",
        },
        { status: 400 }
      );
    }

    const finalDocumentId = documentId || `V-MASTER-${Date.now()}`;

    const existingMaster = await users.findByEmail(email);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      await users.update(existingMaster.id, {
        passwordHash,
        role: "MASTER",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        suspended: false,
        documentId: existingMaster.documentId || finalDocumentId,
        name: name || existingMaster.name
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER actualizado",
        email
      });
    } else {
      await users.create({
        id: newId(),
        email,
        passwordHash,
        name: name || "Administrador Master",
        username: "master",
        role: "MASTER",
        documentId: finalDocumentId,
        emailVerified: true,
        emailVerifiedAt: new Date()
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER creado",
        email
      });
    }
  } catch (error) {
    logger.error("Error al crear/actualizar usuario MASTER", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Error al crear/actualizar usuario MASTER" },
      { status: 500 }
    );
  }
}
