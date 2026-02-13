import { NextRequest, NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { Role, Bank } from "@prisma/client";

export const dynamic = "force-dynamic";

const REF_MIN_LENGTH = 6;
const REF_MAX_LENGTH = 12;
const VALID_BANKS: string[] = Object.values(Bank);

/**
 * GET - Comprueba si la combinación Banco + Referencia + Fecha ya existe en la base de datos.
 * Query: ref (requerido), bank (requerido), date (opcional, YYYY-MM-DD; por defecto hoy).
 * Si existe un ticket con la misma combinación, la referencia no puede usarse.
 */
export async function GET(request: NextRequest) {
  try {
    requireAuth(request, [Role.USER]);
    const ref = request.nextUrl.searchParams.get("ref")?.trim() || "";
    const bank = request.nextUrl.searchParams.get("bank")?.trim() || "";
    const dateParam = request.nextUrl.searchParams.get("date")?.trim() || "";

    if (!ref) {
      return NextResponse.json({ error: "Falta el parámetro ref" }, { status: 400 });
    }

    if (!/^\d+$/.test(ref)) {
      return NextResponse.json({ error: "La referencia debe contener solo dígitos" }, { status: 400 });
    }

    if (ref.length < REF_MIN_LENGTH || ref.length > REF_MAX_LENGTH) {
      return NextResponse.json(
        { error: `La referencia debe tener entre ${REF_MIN_LENGTH} y ${REF_MAX_LENGTH} dígitos` },
        { status: 400 }
      );
    }

    if (!bank || !VALID_BANKS.includes(bank)) {
      return NextResponse.json(
        { error: "Falta o es inválido el parámetro bank. Valores: " + VALID_BANKS.join(", ") },
        { status: 400 }
      );
    }

    // Fecha a verificar: hoy o la pasada por parámetro (YYYY-MM-DD)
    let dayStart: Date;
    let dayEnd: Date;
    if (dateParam) {
      const parsed = new Date(dateParam + "T00:00:00.000Z");
      if (isNaN(parsed.getTime())) {
        return NextResponse.json({ error: "El parámetro date debe tener formato YYYY-MM-DD" }, { status: 400 });
      }
      dayStart = parsed;
      dayEnd = new Date(parsed);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    } else {
      const now = new Date();
      dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0));
      dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
    }

    const existing = await prisma.ticket.findFirst({
      where: {
        paymentMobileRef: ref,
        paymentMobileBank: bank as Bank,
        purchasedAt: { gte: dayStart, lt: dayEnd }
      },
      select: { id: true }
    });

    return NextResponse.json({ used: !!existing });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al comprobar referencia de pago", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al comprobar referencia" }, { status: 500 });
  }
}
