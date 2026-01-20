import { NextResponse } from "next/server";
import { prisma } from "../../../lib/prisma";
import { raffleCreateSchema } from "../../../lib/validators";
import { requireAuth, AuthError } from "../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeNotApproved = searchParams.get("includeNotApproved") === "true";

    // Construir el filtro WHERE
    const whereClause: any = {};
    
    // Por defecto, solo mostrar sorteos aprobados a usuarios públicos
    // Los administradores pueden ver todos pasando includeNotApproved=true
    if (!includeNotApproved) {
      whereClause.approved = true;
    }

    const raffles = await prisma.raffle.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        createdBy: { select: { name: true } },
        ticketItems: { 
          select: { 
            id: true,
            value: true, 
            status: true,
            ticket: {
              select: {
                user: {
                  select: { name: true, email: true }
                }
              }
            }
          } 
        }
      }
    });
    
    // Formatear los datos para asegurar consistencia
    const formattedRaffles = raffles.map((raffle) => ({
      id: raffle.id,
      title: raffle.title,
      description: raffle.description,
      type: raffle.type,
      pricePerSlot: Number(raffle.pricePerSlot) || 0,
      slots: raffle.slots || 0,
      status: raffle.status || "ACTIVE",
      approved: raffle.approved ?? false,
      mirrorMode: raffle.mirrorMode ?? false,
      ticketItems: (raffle.ticketItems || []).map((item: any) => ({
        id: item.id,
        value: item.value || "",
        status: item.status || null,
        ticket: item.ticket
      })),
      prizes: Array.isArray(raffle.prizes) ? raffle.prizes : [],
      winnersCount: raffle.winnersCount || 0,
      startsAt: raffle.startsAt ? raffle.startsAt.toISOString() : null,
      closesAt: raffle.closesAt ? raffle.closesAt.toISOString() : null,
      executedAt: raffle.executedAt ? raffle.executedAt.toISOString() : null,
      createdAt: raffle.createdAt ? raffle.createdAt.toISOString() : null,
      createdBy: raffle.createdBy
    }));
    
    return NextResponse.json(formattedRaffles);
  } catch (error) {
    console.error("Error al obtener sorteos:", error);
    return NextResponse.json({ error: "Error al obtener sorteos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    const parsed = raffleCreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 });
    }

    const raffle = await prisma.raffle.create({
      data: {
        title: parsed.data.title,
        description: parsed.data.description,
        type: parsed.data.type,
        pricePerSlot: parsed.data.pricePerSlot,
        slots: parsed.data.slots,
        winnersCount: parsed.data.winnersCount,
        mirrorMode: parsed.data.mirrorMode ?? false,
        startsAt: parsed.data.startsAt ?? null,
        closesAt: parsed.data.closesAt ?? null,
        prizes: parsed.data.prizes,
        status: "ACTIVE",
        createdById: auth.userId
      }
    });

    // Registrar log de apertura de sorteo con todos los detalles
    if (auth.role === Role.AGENT || auth.role === Role.SUPERADMIN || auth.role === Role.MASTER) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await prisma.auditLog.create({
        data: {
          actorId: auth.userId,
          actorRole: auth.role,
          action: "CREATE_RAFFLE",
          entity: "Raffle",
          entityId: raffle.id,
          ip,
          meta: {
            title: raffle.title,
            description: raffle.description,
            type: raffle.type,
            pricePerSlot: raffle.pricePerSlot.toString(),
            slots: raffle.slots,
            winnersCount: raffle.winnersCount,
            mirrorMode: raffle.mirrorMode,
            prizes: raffle.prizes,
            startsAt: raffle.startsAt?.toISOString() || null,
            closesAt: raffle.closesAt?.toISOString() || null,
            status: raffle.status
          }
        }
      });
    }

    return NextResponse.json(raffle, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al crear sorteo" }, { status: 500 });
  }
}

