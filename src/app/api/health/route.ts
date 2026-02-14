import { NextResponse } from "next/server";

/**
 * Health check para monitorización.
 * GET /api/health → 200 { ok, timestamp }
 * GET /api/health?db=1 → incluye estado de la BD: { ok, timestamp, db: "ok" | "error" }
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const includeDb = url.searchParams.get("db") === "1";

  const payload: { ok: boolean; timestamp: string; db?: "ok" | "error" } = {
    ok: true,
    timestamp: new Date().toISOString(),
  };

  if (includeDb) {
    try {
      const { getSql } = await import("@/lib/db/neon");
      const sql = getSql();
      await sql`SELECT 1`;
      payload.db = "ok";
    } catch {
      payload.db = "error";
      payload.ok = false;
    }
  }

  return NextResponse.json(payload, { status: payload.ok ? 200 : 503 });
}

