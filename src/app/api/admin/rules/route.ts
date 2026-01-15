import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    let rules = await prisma.rules.findFirst();
    if (!rules) {
      rules = await prisma.rules.create({
        data: { content: "" }
      });
    }
    return NextResponse.json({ content: rules.content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener reglas" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    const { content } = await request.json();
    let rules = await prisma.rules.findFirst();
    if (!rules) {
      rules = await prisma.rules.create({
        data: { content, updatedById: auth.userId }
      });
    } else {
      rules = await prisma.rules.update({
        where: { id: rules.id },
        data: { content, updatedById: auth.userId }
      });
    }
    return NextResponse.json({ content: rules.content });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar reglas" }, { status: 500 });
  }
}

