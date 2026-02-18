import { NextResponse } from "next/server";
import { approvalEmailTemplate } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const body = await approvalEmailTemplate.getBody();
    return NextResponse.json({ body: body || "" });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener template" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { body } = await request.json();
    if (typeof body !== "string") {
      return NextResponse.json({ error: "body requerido" }, { status: 400 });
    }
    await approvalEmailTemplate.setBody(body);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al guardar template" }, { status: 500 });
  }
}
