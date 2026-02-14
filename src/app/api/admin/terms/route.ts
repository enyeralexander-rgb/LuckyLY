import { NextResponse } from "next/server";
import { termsAndConditions } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

const MASTER: Role = "MASTER";

export async function GET(request: Request) {
  try {
    requireAuth(request, [MASTER]);
    let terms = await termsAndConditions.findFirst();
    if (!terms) {
      terms = await termsAndConditions.create({ id: newId(), content: "" });
    }
    return NextResponse.json({ content: terms.content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener términos" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [MASTER]);
    const { content } = await request.json();
    let terms = await termsAndConditions.findFirst();
    if (!terms) {
      terms = await termsAndConditions.create({ id: newId(), content, updatedById: auth.userId });
    } else {
      await termsAndConditions.update(terms.id, { content, updatedById: auth.userId });
    }
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar términos" }, { status: 500 });
  }
}
