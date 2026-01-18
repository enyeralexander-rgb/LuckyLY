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
        usernameUpdatedAt: true
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
      select: { documentId: true, nationalId: true, nationalIdType: true }
    });

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
        bankPhone: phoneNumber.trim() // Usar el mismo teléfono para bankPhone
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
        bankPhone: true
      }
    });

    // Crear notificación de actualización de perfil
    await prisma.notification.create({
      data: {
        userId: auth.userId,
        type: "ACCOUNT_UPDATED",
        title: "Datos bancarios actualizados",
        message: "Tus datos bancarios han sido actualizados exitosamente. Podrás recibir pagos de premios con esta información.",
        read: false
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

