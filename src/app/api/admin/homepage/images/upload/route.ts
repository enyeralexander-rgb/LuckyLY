import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import type { Role } from "../../../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];
const PREFIX = "carousel/";

export async function POST(request: Request) {
  try {
    requireAuth(request, ROLES);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json(
        { error: "BLOB_READ_WRITE_TOKEN no está configurado. Añade la variable de entorno." },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        error: "Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WEBP"
      }, { status: 400 });
    }

    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({
        error: "El archivo es muy grande. Tamaño máximo: 5MB"
      }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const pathname = `${PREFIX}${timestamp}-${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      token
    });

    return NextResponse.json({
      success: true,
      url: blob.url,
      name: pathname
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al subir imagen a Blob", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({
      error: "Error al subir la imagen",
      message: err instanceof Error ? err.message : "Error desconocido"
    }, { status: 500 });
  }
}
