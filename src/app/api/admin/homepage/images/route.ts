import { NextResponse } from "next/server";
import { readdir } from "fs/promises";
import { join } from "path";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".mp4", ".webm"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    
    const imagesPath = join(process.cwd(), "public", "images");
    
    try {
      const files = await readdir(imagesPath);
      const imageFiles = files
        .filter(file => {
          const ext = file.toLowerCase().substring(file.lastIndexOf("."));
          return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
        })
        .map(file => ({
          name: file,
          url: `/images/${file}`,
          type: file.toLowerCase().endsWith(".mp4") || file.toLowerCase().endsWith(".webm") ? "video" : "image"
        }));

      return NextResponse.json({ images: imageFiles });
    } catch (error) {
      console.error("Error leyendo directorio de imágenes:", error);
      return NextResponse.json({ images: [] });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener imágenes:", err);
    return NextResponse.json({ error: "Error al obtener imágenes" }, { status: 500 });
  }
}
