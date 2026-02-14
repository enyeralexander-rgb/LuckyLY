import { NextRequest, NextResponse } from "next/server";
import { tickets } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import type { Role, Bank } from "../../../../lib/db-types";

export const dynamic = "force-dynamic";

const REF_MIN_LENGTH = 6;
const REF_MAX_LENGTH = 12;

const VALID_BANKS: string[] = [
  "BANESCO", "VENEZUELA", "MERCANTIL", "BOD", "PROVINCIAL", "BICENTENARIO", "OTRA", "BANCO_100", "BANCAMIGA",
  "BANCARIBE", "BANCO_ACTIVO", "BANCO_AGRICOLA", "BANCO_CARONI", "BANFANB", "BANCO_TESORO", "BANCO_EXTERIOR",
  "BFC", "BANCO_INTERNACIONAL_DESARROLLO", "BNC", "BANCO_PLAZA", "BANCO_SOFITASA", "BANCRECER", "BANGENTE",
  "BANPLUS", "DELSUR", "MI_BANCO", "N58_BANCO_DIGITAL",
];

export async function GET(request: NextRequest) {
  try {
    requireAuth(request, ["USER" as Role]);
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

    const existing = await tickets.findFirstByPaymentRef({
      ref,
      bank: bank as Bank,
      dayStart,
      dayEnd,
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
