import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role, Bank } from "@prisma/client";
import { mapBankNameToEnum } from "../../../../lib/banks";

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
        documentId: true,
        nationalId: true,
        nationalIdType: true,
        phoneNumber: true,
        bank: true,
        bankPhone: true,
        emailVerified: true,
        emailUpdatedAt: true,
        usernameUpdatedAt: true,
        bankDataUpdatedAt: true
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
    
    const { bank, phoneNumber } = body;

    // Validar campos obligatorios: bank y phoneNumber
    if (!bank || !phoneNumber || phoneNumber.trim().length < 11) {
      return NextResponse.json({ 
        error: "Todos los campos son obligatorios. El teléfono debe tener al menos 11 números." 
      }, { status: 400 });
    }

    // Obtener el usuario actual para extraer nationalId y nationalIdType del documentId
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId },
      select: { documentId: true, nationalId: true, nationalIdType: true, bank: true, phoneNumber: true, bankDataUpdatedAt: true }
    });

    // Si ya tiene datos bancarios, verificar restricción de 1 semana
    if (currentUser?.bank && currentUser?.phoneNumber && currentUser?.bankDataUpdatedAt) {
      const lastUpdate = new Date(currentUser.bankDataUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysSinceUpdate < 7) {
        const daysRemaining = 7 - daysSinceUpdate;
        return NextResponse.json({ 
          error: `Solo puedes modificar tus datos bancarios una vez por semana. Faltan ${daysRemaining} día(s).` 
        }, { status: 400 });
      }
    }

    if (!currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Si no tiene nationalId, extraerlo del documentId
    let nationalId = currentUser.nationalId;
    let nationalIdType = currentUser.nationalIdType;

    if (!nationalId && currentUser.documentId) {
      // Extraer tipo y número del documentId (formato: "V-12345678" o "E-12345678")
      if (currentUser.documentId.includes("-")) {
        const parts = currentUser.documentId.split("-");
        if (parts.length >= 2) {
          nationalIdType = (parts[0] === "E" ? "E" : "V") as "V" | "E";
          nationalId = parts.slice(1).join("");
        } else {
          nationalId = currentUser.documentId;
        }
      } else {
        nationalId = currentUser.documentId;
      }
    }

    // Mapear el nombre del banco al enum de Prisma
    const bankEnum = mapBankNameToEnum(bank);
    if (!bankEnum) {
      return NextResponse.json({ 
        error: "Banco inválido. Por favor selecciona un banco válido." 
      }, { status: 400 });
    }

    const user = await prisma.user.update({
      where: { id: auth.userId },
      data: {
        nationalId: nationalId || null,
        nationalIdType: nationalIdType || null,
        bank: bankEnum as Bank,
        phoneNumber: phoneNumber.trim(),
        bankPhone: phoneNumber.trim(), // Usar el mismo teléfono para bankPhone
        bankDataUpdatedAt: new Date() // Registrar fecha de actualización
      },
      select: {
        id: true,
        name: true,
        email: true,
        documentId: true,
        nationalId: true,
        nationalIdType: true,
        phoneNumber: true,
        bank: true,
        bankPhone: true,
        bankDataUpdatedAt: true
      }
    });

    return NextResponse.json(user);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar perfil:", err);
    
    // Proporcionar mensaje de error más específico
    if (err && typeof err === 'object' && 'code' in err) {
      const prismaError = err as { code: string; meta?: any };
      if (prismaError.code === 'P2002') {
        return NextResponse.json({ error: "Error de duplicación en la base de datos" }, { status: 409 });
      }
      if (prismaError.code === 'P2025') {
        return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
      }
    }
    
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ 
      error: "Error al actualizar perfil",
      details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
    }, { status: 500 });
  }
}

