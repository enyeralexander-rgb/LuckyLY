import { NextResponse } from "next/server";
import { prizeEmailTemplate } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const body = await prizeEmailTemplate.getBody();
    return NextResponse.json({ body: body ?? "" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ body: "" });
  }
}

export async function PUT(request: Request) {
  try {
    requireAuth(request, ROLES);
    const data = await request.json();
    const body = typeof data.body === "string" ? data.body : "";
    await prizeEmailTemplate.setBody(body);
    return NextResponse.json({ body });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al guardar plantilla" }, { status: 500 });
  }
}
