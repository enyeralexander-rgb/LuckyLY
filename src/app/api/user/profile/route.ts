import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { users } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Bank, Role } from "../../../../lib/db-types";
import { mapBankNameToEnum } from "../../../../lib/banks";
import { profileUpdateSchema } from "../../../../lib/validators";
import { logger } from "../../../../lib/logger";

const USER: Role = "USER";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);

    const user = await users.findById(auth.userId);
    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        documentId: user.documentId,
        nationalId: user.nationalId,
        nationalIdType: user.nationalIdType,
        phoneNumber: user.phoneNumber,
        bank: user.bank,
        bankPhone: user.bankPhone,
        emailVerified: user.emailVerified,
        emailUpdatedAt: user.emailUpdatedAt,
        usernameUpdatedAt: user.usernameUpdatedAt,
        bankDataUpdatedAt: user.bankDataUpdatedAt,
      },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener perfil" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [USER]);
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Cuerpo de la petición inválido (JSON)" }, { status: 400 });
    }
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.issues.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }
    const { bank, phoneNumber } = parsed.data;

    const currentUser = await users.findById(auth.userId);
    if (!currentUser) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (currentUser.bank && currentUser.phoneNumber && currentUser.bankDataUpdatedAt) {
      const lastUpdate = new Date(currentUser.bankDataUpdatedAt);
      const now = new Date();
      const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceUpdate < 7) {
        const daysRemaining = 7 - daysSinceUpdate;
        return NextResponse.json({
          error: `Solo puedes modificar tus datos bancarios una vez por semana. Faltan ${daysRemaining} día(s).`,
        }, { status: 400 });
      }
    }

    let nationalId = currentUser.nationalId;
    let nationalIdType = currentUser.nationalIdType;
    if (!nationalId && currentUser.documentId) {
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

    const bankEnum = mapBankNameToEnum(bank);
    if (!bankEnum) {
      return NextResponse.json({ error: "Banco inválido. Por favor selecciona un banco válido." }, { status: 400 });
    }

    const updated = await users.update(auth.userId, {
      nationalId: nationalId || null,
      nationalIdType: nationalIdType || null,
      bank: bankEnum as Bank,
      phoneNumber: phoneNumber.trim(),
      bankPhone: phoneNumber.trim(),
      bankDataUpdatedAt: new Date(),
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      documentId: updated.documentId,
      nationalId: updated.nationalId,
      nationalIdType: updated.nationalIdType,
      phoneNumber: updated.phoneNumber,
      bank: updated.bank,
      bankPhone: updated.bankPhone,
      bankDataUpdatedAt: updated.bankDataUpdatedAt,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar perfil", { error: err instanceof Error ? err.message : String(err) });
    const errorMessage = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json(
      { error: "Error al actualizar perfil", details: process.env.NODE_ENV === "development" ? errorMessage : undefined },
      { status: 500 }
    );
  }
}
