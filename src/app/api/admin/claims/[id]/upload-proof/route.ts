import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import { Role } from "@prisma/client";

const PREFIX = "payment-proofs/";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);

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

    // Validar que sea una imagen
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Solo se permiten archivos de imagen (JPG, PNG, GIF, WEBP)" }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "El archivo no puede ser mayor a 5MB" }, { status: 400 });
    }

    const claim = await prisma.prizeClaim.findUnique({
      where: { id: params.id },
    });

    if (!claim) {
      return NextResponse.json({ error: "Reclamo no encontrado" }, { status: 404 });
    }

    // Subir a Vercel Blob Storage (funciona en serverless sin filesystem local)
    const timestamp = Date.now();
    const extension = file.name.split(".").pop() || "png";
    const safeName = `${params.id}-${timestamp}.${extension}`;
    const pathname = `${PREFIX}${safeName}`;

    const blob = await put(pathname, file, {
      access: "public",
      token
    });

    // Guardar URL del blob en la base de datos
    await prisma.prizeClaim.update({
      where: { id: params.id },
      data: { paymentProof: blob.url },
    });

    return NextResponse.json({ success: true, proofUrl: blob.url });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al subir comprobante", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al subir comprobante" }, { status: 500 });
  }
}
