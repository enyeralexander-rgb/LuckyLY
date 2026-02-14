import { NextResponse } from "next/server";
import { list } from "@vercel/blob";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";

const MASTER: Role = "MASTER";
const PREFIX = "payment-mobile/";

export async function GET(request: Request) {
  try {
    requireAuth(request, [MASTER]);

    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      return NextResponse.json({ images: [] });
    }

    const { blobs } = await list({ prefix: PREFIX, token });
    const images = blobs
      .filter((b) => /\.(jpg|jpeg|png|gif|webp)$/i.test(b.pathname))
      .map((b) => ({ url: b.url, pathname: b.pathname }));

    return NextResponse.json({ images });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error listando imágenes pago móvil", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al listar imágenes" }, { status: 500 });
  }
}
