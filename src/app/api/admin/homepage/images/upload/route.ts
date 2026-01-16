import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    const formData = await request.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return NextResponse.json({ error: "No se proporcionó ningún archivo" }, { status: 400 });
    }

    // Validar tipo de archivo
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: "Tipo de archivo no permitido. Solo se permiten: JPG, PNG, GIF, WEBP" 
      }, { status: 400 });
    }

    // Validar tamaño (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: "El archivo es muy grande. Tamaño máximo: 5MB" 
      }, { status: 400 });
    }

    // Generar nombre único con timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const fileName = `${timestamp}-${originalName}`;
    
    // Convertir a buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Crear directorio si no existe
    const uploadDir = join(process.cwd(), "public", "images");
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    // Guardar archivo
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);
    
    console.log("✅ [Upload API] Imagen subida exitosamente:", fileName);

    return NextResponse.json({ 
      success: true,
      url: `/images/${fileName}`,
      name: fileName
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("❌ [Upload API] Error al subir imagen:", err);
    return NextResponse.json({ 
      error: "Error al subir la imagen",
      message: err instanceof Error ? err.message : "Error desconocido"
    }, { status: 500 });
  }
}
