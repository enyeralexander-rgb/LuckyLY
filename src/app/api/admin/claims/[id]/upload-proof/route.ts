import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prizeClaims } from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import type { Role } from "../../../../../../lib/db-types";

const PREFIX = "payment-proofs/";
const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: { id: string } }) {
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
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)" }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede ser mayor a 5MB" }, { status: 400 });
    }

    const claim = await prizeClaims.findById(params.id);
    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "png";
    const safeName = `${params.id}-${timestamp}.${extension}`;
    const pathname = `${PREFIX}${safeName}`;

    const blob = await put(pathname, file, { access: "public", token });

    await prizeClaims.update(params.id, { paymentProof: blob.url });

    return NextResponse.json({ success: true, proofUrl: blob.url });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al subir comprobante", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al subir comprobante" }, { status: 500 });
  }
}
