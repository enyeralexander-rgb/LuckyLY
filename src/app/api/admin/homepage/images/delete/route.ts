import { NextResponse } from "next/server";
import { del } from "@vercel/blob";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import type { Role } from "../../../../../../lib/db-types";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];
const PROTECTED_NAMES = [
  "FLYER-001.png",
  "FLYER-002.png",
  "FLYER-003.png",
  "LuckyLy-Isotipo.png",
  "LuckyLy-Logo.png",
  "ruleta-fortuna-hero.jpg",
  "RULETA FONDO REDES.mp4"
];

export async function DELETE(request: Request) {
  try {
    requireAuth(request, ROLES);

    const body = await request.json();
    const { imageUrl } = body;

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "No se proporcionó URL de imagen" }, { status: 400 });
    }

    // URL de Vercel Blob (https://....blob.vercel-storage.com/...)
    if (imageUrl.startsWith("http") && imageUrl.includes("blob.vercel-storage.com")) {
      const token = process.env.BLOB_READ_WRITE_TOKEN;
      if (!token) {
        return NextResponse.json(
          { error: "BLOB_READ_WRITE_TOKEN no configurado" },
          { status: 500 }
        );
      }
      await del(imageUrl, { token });
      return NextResponse.json({ success: true, message: "Imagen eliminada exitosamente" });
    }

    // URL local /images/...
    if (!imageUrl.startsWith("/images/")) {
      return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
    }

    const fileName = imageUrl.replace("/images/", "");
    if (PROTECTED_NAMES.includes(fileName)) {
      return NextResponse.json({
        error: "No se puede eliminar una imagen protegida del sistema"
      }, { status: 403 });
    }

    const filePath = join(process.cwd(), "public", "images", fileName);
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "La imagen no existe" }, { status: 404 });
    }

    await unlink(filePath);
    return NextResponse.json({ success: true, message: "Imagen eliminada exitosamente" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al eliminar imagen", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({
      error: "Error al eliminar la imagen",
      message: err instanceof Error ? err.message : "Error desconocido"
    }, { status: 500 });
  }
}
