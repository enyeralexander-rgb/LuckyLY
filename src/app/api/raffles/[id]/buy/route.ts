import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { ticketPurchaseSchema } from "../../../../../lib/validators";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role, Bank } from "@prisma/client";

const VALID_BANKS: string[] = Object.values(Bank);

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const raffleId = params.id;
    const body = await request.json();
    const parsed = ticketPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }

    const items = Array.from(new Set(parsed.data.items)); // sin duplicados

    const raffle = await prisma.raffle.findUnique({ where: { id: raffleId } });
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }
    if (raffle.status !== "ACTIVE") {
      return NextResponse.json({ error: "Sorteo no está activo" }, { status: 409 });
    }

    const totalPaid = Number(raffle.pricePerSlot) * items.length;

    const paymentMethod = parsed.data.paymentMethod ?? null;
    const paymentMobileRefRaw = parsed.data.paymentMobileRef ?? null;
    let paymentMobileRef: string | null = typeof paymentMobileRefRaw === "string" ? paymentMobileRefRaw.trim() : null;
    const paymentMobileBankRaw = parsed.data.paymentMobileBank ?? null;
    let paymentMobileBank: Bank | null = typeof paymentMobileBankRaw === "string" && VALID_BANKS.includes(paymentMobileBankRaw) ? (paymentMobileBankRaw as Bank) : null;

    // Validar pago móvil: Banco + Referencia + Fecha (combinación única)
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
      // Comprobar que la combinación Banco + Referencia + Fecha (hoy) no exista ya
      const now = new Date();
      const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));
      const dayEnd = new Date(dayStart);
      dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
      const duplicate = await prisma.ticket.findFirst({
        where: {
          paymentMobileRef,
          paymentMobileBank,
          purchasedAt: { gte: dayStart, lt: dayEnd }
        },
        select: { id: true }
      });
      if (duplicate) {
        return NextResponse.json({ error: "Esta referencia ya se registro." }, { status: 400 });
      }
    }

    const ticket = await prisma.$transaction(async (tx) => {
      // Para pago móvil, verificar cupos pendientes pero no confirmados
      const takenCount = await tx.ticketItem.count({ 
        where: { 
          raffleId,
          status: paymentMethod === "MOBILE" ? { in: ["CONFIRMED"] } : { not: "REJECTED" }
        } 
      });
      
      if (takenCount + items.length > raffle.slots) {
        throw new Error("No hay cupos suficientes");
      }

      // Verificar conflictos (excluyendo rechazados para pago móvil)
      const conflicts = await tx.ticketItem.findMany({
        where: { 
          raffleId, 
          value: { in: items },
          status: paymentMethod === "MOBILE" ? { in: ["CONFIRMED"] } : { not: "REJECTED" }
        },
        select: { value: true }
      });
      if (conflicts.length > 0) {
        throw new Error(`Cupos ocupados: ${conflicts.map((c) => c.value).join(", ")}`);
      }

      const ticketStatus = paymentMethod === "MOBILE" ? "PENDING" : "CONFIRMED";
      const itemStatus = paymentMethod === "MOBILE" ? "PENDING" : "CONFIRMED";
      // Prisma PaymentMethod enum: BANESCO, BINANCE, MOBILE; "OTHER" del schema Zod se guarda como null
      const paymentMethodForDb: "MOBILE" | null = paymentMethod === "MOBILE" ? "MOBILE" : null;

      const created = await tx.ticket.create({
        data: {
          raffleId,
          userId: auth.userId,
          items,
          totalPaid,
          status: ticketStatus,
          paymentMethod: paymentMethodForDb,
          paymentMobileRef: paymentMobileRef || null,
          paymentMobileBank: paymentMobileBank || null,
          ticketItems: {
            createMany: {
              data: items.map((value) => ({ 
                value, 
                raffleId,
                status: itemStatus
              }))
            }
          }
        },
        include: {
          raffle: true
        }
      });



      // Si el usuario tiene un link de referido asociado, actualizar contadores
      const user = await tx.user.findUnique({
        where: { id: auth.userId },
        include: {
          referralVisits: {
            where: { purchased: false },
            take: 1,
            orderBy: { createdAt: "desc" }
          }
        }
      });

      if (user && user.referralVisits.length > 0) {
        const visit = user.referralVisits[0];
        await tx.referralVisit.update({
          where: { id: visit.id },
          data: { purchased: true }
        });

        await tx.referralLink.update({
          where: { id: visit.referralLinkId },
          data: {
            purchases: { increment: 1 },
            revenue: { increment: totalPaid }
          }
        });
      }

      return created;
    });

    return NextResponse.json({ ticketId: ticket.id }, { status: 201 });
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

