import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { ticketPurchaseSchema } from "@/lib/validators";
import { requireAuth, AuthError } from "@/lib/auth";
import { newId } from "@/lib/id";
import type { Role, Bank } from "@/lib/db-types";

const VALID_BANKS: string[] = [
  "BANESCO", "VENEZUELA", "MERCANTIL", "BOD", "PROVINCIAL", "BICENTENARIO", "OTRA",
  "BANCO_100", "BANCAMIGA", "BANCARIBE", "BANCO_ACTIVO", "BANCO_AGRICOLA", "BANCO_CARONI",
  "BANFANB", "BANCO_TESORO", "BANCO_EXTERIOR", "BFC", "BANCO_INTERNACIONAL_DESARROLLO",
  "BNC", "BANCO_PLAZA", "BANCO_SOFITASA", "BANCRECER", "BANGENTE", "BANPLUS",
  "DELSUR", "MI_BANCO", "N58_BANCO_DIGITAL",
];

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["USER"] as Role[]);
    const raffleId = params.id;
    const body = await request.json();
    const parsed = ticketPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }

    const items = Array.from(new Set(parsed.data.items)) as string[];

    const raffle = await db.raffles.findById(raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }
    if (raffle.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sorteo no está activo" }, { status: 409 });
    }

    const totalPaid = Number(raffle.pricePerSlot) * items.length;

    const paymentMethod = parsed.data.paymentMethod ?? null;
    const paymentMobileRefRaw = parsed.data.paymentMobileRef ?? null;
    const paymentMobileRef: string | null = typeof paymentMobileRefRaw === "string" ? paymentMobileRefRaw.trim() : null;
    const paymentMobileBankRaw = parsed.data.paymentMobileBank ?? null;
    const paymentMobileBank: Bank | null = typeof paymentMobileBankRaw === "string" && VALID_BANKS.includes(paymentMobileBankRaw) ? (paymentMobileBankRaw as Bank) : null;

    if (paymentMethod === "MOBILE") {
      if (!paymentMobileRef) {
        return NextResponse.json({ error: "Debes proporcionar el número de referencia del pago móvil" }, { status: 400 });
      }
      if (!/^\d+$/.test(paymentMobileRef)) {
        return NextResponse.json({ error: "La referencia debe contener solo dígitos" }, { status: 400 });
      }
      if (paymentMobileRef.length < 6 || paymentMobileRef.length > 12) {
        return NextResponse.json({ error: "La referencia debe tener entre 6 y 12 dígitos" }, { status: 400 });
      }
      if (!paymentMobileBank) {
        return NextResponse.json({ error: "Debes indicar el banco desde el cual realizaste el pago. Valores válidos: " + VALID_BANKS.join(", ") }, { status: 400 });
      }
      const now = new Date();
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const duplicate = await db.tickets.findFirstByPaymentRef({ ref: paymentMobileRef, bank: paymentMobileBank, dayStart, dayEnd });
      if (duplicate) {
        return NextResponse.json({ error: "Esta referencia ya se registro." }, { status: 400 });
      }
    }

    const statusFilter = paymentMethod === "MOBILE" ? "CONFIRMED" : "not_REJECTED";
    const takenCount = paymentMethod === "MOBILE"
      ? ((await db.ticketItems.countByRaffle([raffleId], "CONFIRMED"))[raffleId] ?? 0)
      : await db.ticketItems.countByRaffleStatusIn(raffleId, ["PENDING", "CONFIRMED"]);

    if (takenCount + items.length > raffle.slots) {
      return NextResponse.json({ error: "No hay cupos suficientes" }, { status: 409 });
    }

    const conflicts = await db.ticketItems.findManyByRaffleAndValues(raffleId, items, statusFilter);
    if (conflicts.length > 0) {
      return NextResponse.json({ error: `Cupos ocupados: ${conflicts.map((c) => c.value).join(", ")}` }, { status: 409 });
    }

    const ticketStatus = paymentMethod === "MOBILE" ? "PENDING" : "CONFIRMED";
    const itemStatus = paymentMethod === "MOBILE" ? "PENDING" : "CONFIRMED";
    const paymentMethodForDb: "MOBILE" | null = paymentMethod === "MOBILE" ? "MOBILE" : null;

    const ticketId = newId();
    await db.tickets.create({
      id: ticketId,
      raffleId,
      userId: auth.userId,
      items,
      totalPaid,
      status: ticketStatus,
      paymentMethod: paymentMethodForDb,
      paymentMobileRef: paymentMobileRef ?? null,
      paymentMobileBank: paymentMobileBank ?? null,
    });

    const itemRows = items.map((value) => ({
      id: newId(),
      raffleId,
      ticketId,
      value,
      status: itemStatus as "PENDING" | "CONFIRMED" | "REJECTED",
    }));
    try {
      await db.ticketItems.createMany(itemRows);
    } catch (err) {
      await db.tickets.deleteById(ticketId);
      throw err;
    }

    const visit = await db.referralVisit.findFirstByUserPurchasedFalse(auth.userId);
    if (visit) {
      await db.referralVisit.update(visit.id, { purchased: true });
      const link = await db.referralLink.findById(visit.referralLinkId);
      if (link) {
        await db.referralLink.update(visit.referralLinkId, {
          purchases: (link.purchases ?? 0) + 1,
          revenue: Number(link.revenue || 0) + totalPaid,
        });
      }
    }

    return NextResponse.json({ ticketId }, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    if (err instanceof Error && err.message) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    return NextResponse.json({ error: "Error al comprar cupos" }, { status: 500 });
  }
}
