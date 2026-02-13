import { NextResponse } from "next/server";
import { prisma } from "../../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import { Role } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "Archivo requerido" }, { status: 400 });
    }

    // Validar que sea una imagen
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Solo se permiten archivos de imagen" }, { status: 400 });
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

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), "public", "uploads", "payment-proofs");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Generar nombre único para el archivo
    const timestamp = Date.now();
    const extension = file.name.split(".").pop();
    const fileName = `${params.id}-${timestamp}.${extension}`;
    const filePath = join(uploadDir, fileName);

    // Guardar archivo
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Guardar ruta en la base de datos
    const proofUrl = `/uploads/payment-proofs/${fileName}`;
    await prisma.prizeClaim.update({
      where: { id: params.id },
      data: { paymentProof: proofUrl },
    });

    return NextResponse.json({ success: true, proofUrl });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al subir comprobante", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al subir comprobante" }, { status: 500 });
  }
}
