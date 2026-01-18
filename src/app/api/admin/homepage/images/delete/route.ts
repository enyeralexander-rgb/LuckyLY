import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { Role } from "@prisma/client";
import { unlink } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function DELETE(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    const body = await request.json();
    const { imageUrl } = body;
    
    if (!imageUrl) {
      return NextResponse.json({ error: "No se proporcionó URL de imagen" }, { status: 400 });
    }

    // Validar que la URL sea de /images/
    if (!imageUrl.startsWith("/images/")) {
      return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
    }

    // Extraer nombre de archivo
    const fileName = imageUrl.replace("/images/", "");
    
    // Prevenir eliminación de imágenes por defecto del proyecto
    const protectedImages = [
      "FLYER-001.png",
      "FLYER-002.png", 
      "FLYER-003.png",
      "LuckyLy-Isotipo.png",
      "LuckyLy-Logo.png",
      "ruleta-fortuna-hero.jpg",
      "RULETA FONDO REDES.mp4"
    ];
    
    if (protectedImages.includes(fileName)) {
      return NextResponse.json({ 
        error: "No se puede eliminar una imagen protegida del sistema" 
      }, { status: 403 });
    }

    // Construir ruta del archivo
    const filePath = join(process.cwd(), "public", "images", fileName);
    
    // Verificar si existe
    if (!existsSync(filePath)) {
      return NextResponse.json({ error: "La imagen no existe" }, { status: 404 });
    }

    // Eliminar archivo
    await unlink(filePath);
    
    console.log("✅ [Delete API] Imagen eliminada exitosamente:", fileName);

    return NextResponse.json({ 
      success: true,
      message: "Imagen eliminada exitosamente"
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("❌ [Delete API] Error al eliminar imagen:", err);
    return NextResponse.json({ 
      error: "Error al eliminar la imagen",
      message: err instanceof Error ? err.message : "Error desconocido"
    }, { status: 500 });
  }
}
