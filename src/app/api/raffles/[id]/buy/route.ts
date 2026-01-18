import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { ticketPurchaseSchema } from "../../../../../lib/validators";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role, NotificationType } from "@prisma/client";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, [Role.USER]);
    const raffleId = params.id;
    const body = await request.json();
    const parsed = ticketPurchaseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
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

    const paymentMethod = body.paymentMethod || null;
    const paymentMobileRef = body.paymentMobileRef || null;

    // Validar referencia de pago móvil si el método es MOBILE
    if (paymentMethod === "MOBILE" && !paymentMobileRef) {
      return NextResponse.json({ error: "Debes proporcionar el número de referencia del pago móvil" }, { status: 400 });
    }

    // Validar límite de 2 cupos por usuario (solo contar cupos confirmados y pendientes)
    const userTickets = await prisma.ticket.findMany({
      where: { 
        raffleId, 
        userId: auth.userId,
        status: { in: ["CONFIRMED", "PENDING"] } // Incluir pendientes también
      },
      include: { 
        ticketItems: {
          where: {
            status: { in: ["CONFIRMED", "PENDING"] } // Solo contar confirmados y pendientes
          }
        }
      }
    });
    
    const totalUserSlots = userTickets.reduce((sum, t) => {
      // Contar los ticketItems confirmados o pendientes
      return sum + t.ticketItems.length;
    }, 0);
    
    if (totalUserSlots >= 2) {
      return NextResponse.json({ error: "Ya has alcanzado el límite de 2 cupos por sorteo" }, { status: 400 });
    }
    
    if (totalUserSlots + items.length > 2) {
      return NextResponse.json({ 
        error: `Solo puedes comprar un máximo de 2 cupos por sorteo. Ya tienes ${totalUserSlots} cupo(s) comprado(s).` 
      }, { status: 400 });
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

      const created = await tx.ticket.create({
        data: {
          raffleId,
          userId: auth.userId,
          items,
          totalPaid,
          status: ticketStatus,
          paymentMethod: paymentMethod || null,
          paymentMobileRef: paymentMobileRef || null,
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

      // Crear notificación de compra
      await tx.notification.create({
        data: {
          userId: auth.userId,
          type: paymentMethod === "MOBILE" ? NotificationType.TICKET_PURCHASED : NotificationType.TICKET_CONFIRMED,
          title: paymentMethod === "MOBILE" 
            ? "Compra de cupos pendiente de confirmación" 
            : "Cupos comprados exitosamente",
          message: paymentMethod === "MOBILE"
            ? `Has comprado ${items.length} cupo(s) para "${created.raffle.title}". Tu pago está pendiente de confirmación por un administrador.`
            : `Has comprado ${items.length} cupo(s) (${items.join(", ")}) para "${created.raffle.title}" por un total de ${Number(totalPaid).toFixed(2)} Bs.`,
          data: {
            ticketId: created.id,
            raffleId: raffleId,
            items: items,
            totalPaid: Number(totalPaid)
          }
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

