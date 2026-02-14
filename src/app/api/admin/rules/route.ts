import { NextResponse } from "next/server";
import { rules } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

const MASTER: Role = "MASTER";

export async function GET(request: Request) {
  try {
    requireAuth(request, [MASTER]);
    let rulesRow = await rules.findFirst();
    if (!rulesRow) {
      rulesRow = await rules.create({ id: newId(), content: "" });
    }
    return NextResponse.json({ content: rulesRow.content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener reglas" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [MASTER]);
    const { content } = await request.json();
    let rulesRow = await rules.findFirst();
    if (!rulesRow) {
      rulesRow = await rules.create({ id: newId(), content, updatedById: auth.userId });
    } else {
      await rules.update(rulesRow.id, { content, updatedById: auth.userId });
    }
    return NextResponse.json({ content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar reglas" }, { status: 500 });
  }
}
