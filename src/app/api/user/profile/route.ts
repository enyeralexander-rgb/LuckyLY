import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    
    const user = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
        nationalId: true,
        nationalIdType: true,
        phoneNumber: true,
        bank: true,
        bankPhone: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const body = await request.json();
    
    const { nationalId, nationalIdType, bank, phoneNumber } = body;

    if (!nationalId || !bank || !phoneNumber) {
      return NextResponse.json({ error: "Todos los campos son obligatorios" }, { status: 400 });
    }

    // Validar que nationalIdType sea V o E si se proporciona
    if (nationalIdType && !["V", "E"].includes(nationalIdType)) {
      return NextResponse.json({ error: "Tipo de cédula inválido. Debe ser V o E" }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        nationalId,
        nationalIdType: nationalIdType || null,
        bank: bank as any,
        phoneNumber,
        bankPhone: phoneNumber // Usar el mismo teléfono para bankPhone
      },
      select: {
        id: true,
        name: true,
        email: true,
        nationalId: true,
        nationalIdType: true,
        phoneNumber: true,
        bank: true,
        bankPhone: true
      }
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar perfil:", err);
    return NextResponse.json({ error: "Error al actualizar perfil" }, { status: 500 });
  }
}

