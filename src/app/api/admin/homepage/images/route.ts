import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { readdir } from "fs/promises";
import { join } from "path";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

const PREFIX = "carousel/";
const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".mp4", ".webm"];

export async function GET(request: Request) {
  try {
    requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    const blobImages: { name: string; url: string; type: "image" | "video" }[] = [];

    if (token) {
      try {
        const { blobs } = await list({ prefix: PREFIX, token });
        blobImages.push(
          ...blobs.map((b) => ({
            name: b.pathname.replace(PREFIX, ""),
            url: b.url,
            type: (b.pathname.toLowerCase().endsWith(".mp4") || b.pathname.toLowerCase().endsWith(".webm")) ? "video" as const : "image" as const
          }))
        );
      } catch (e) {
        console.error("Error listando blobs:", e);
      }
    }

    let localImages: { name: string; url: string; type: "image" | "video" }[] = [];
    const imagesPath = join(process.cwd(), "public", "images");
    try {
      const files = await readdir(imagesPath);
      localImages = files
        .filter((file) => {
          const ext = file.toLowerCase().substring(file.lastIndexOf("."));
          return ALLOWED_IMAGE_EXTENSIONS.includes(ext);
        })
        .map((file) => ({
          name: file,
          url: `/images/${file}`,
          type: (file.toLowerCase().endsWith(".mp4") || file.toLowerCase().endsWith(".webm")) ? "video" : "image"
        }));
    } catch {
      // Sin directorio local o error
    }

    const images = [...blobImages, ...localImages];
    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener imágenes:", err);
    return NextResponse.json({ error: "Error al obtener imágenes" }, { status: 500 });
  }
}
