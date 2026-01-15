import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    let terms = await prisma.termsAndConditions.findFirst();
    if (!terms) {
      terms = await prisma.termsAndConditions.create({
        data: { content: "" }
      });
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
    const auth = requireAuth(request, [Role.MASTER]);
    const { content } = await request.json();
    let terms = await prisma.termsAndConditions.findFirst();
    if (!terms) {
      terms = await prisma.termsAndConditions.create({
        data: { content, updatedById: auth.userId }
      });
    } else {
      terms = await prisma.termsAndConditions.update({
        where: { id: terms.id },
        data: { content, updatedById: auth.userId }
      });
    }
    return NextResponse.json({ content: terms.content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar términos" }, { status: 500 });
  }
}

