import { NextResponse } from "next/server";
import { faqItem } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

export const dynamic = "force-dynamic";

const ROLES: Role[] = ["MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const items = await faqItem.findMany();
    return NextResponse.json(items);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener FAQs" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const { question, answer } = await request.json();
    if (!question || !answer) {
      return NextResponse.json({ error: "Pregunta y respuesta son requeridas" }, { status: 400 });
    }
    const allItems = await faqItem.findMany();
    const newOrder = allItems.length;
    const created = await faqItem.create({
      id: newId(),
      question,
      answer,
      order: newOrder,
      updatedById: auth.userId,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear FAQ" }, { status: 500 });
  }
}
