import { NextResponse } from "next/server";
import { faqItem } from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["MASTER"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id } = await params;
    const body = await request.json();
    const { method } = body;

    const existing = await faqItem.findById(id);
    if (!existing) {
      return NextResponse.json({ error: "FAQ no encontrada" }, { status: 404 });
    }

    if (method === "delete") {
      await faqItem.deleteById(id);
      return NextResponse.json({ success: true });
    }

    // Default: update
    const updated = await faqItem.update(id, {
      question: body.question,
      answer: body.answer,
      active: body.active,
      updatedById: auth.userId,
    });
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar FAQ" }, { status: 500 });
  }
}
