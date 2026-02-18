import { NextResponse } from "next/server";
import { faqItem } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["MASTER"];

export async function POST(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { ids } = await request.json();
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: "ids requeridos" }, { status: 400 });
    }
    await faqItem.reorder(ids);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al reordenar" }, { status: 500 });
  }
}
