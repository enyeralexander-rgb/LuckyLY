import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { raffleCreateSchema } from "@/lib/validators";
import { requireAuth, AuthError, getTokenFromRequest } from "@/lib/auth";
import { isDatabaseConnectionError } from "@/lib/dbErrors";
import { logger } from "@/lib/logger";
import { newId } from "@/lib/id";
import type { Role, DrawType } from "@/lib/db-types";

const CREATOR_ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeNotApproved = searchParams.get("includeNotApproved") === "true";
    const statusFilter = searchParams.get("status") ?? undefined;

    const where: { approved?: boolean; status?: string } = {};
    if (!includeNotApproved) where.approved = true;
    if (statusFilter) where.status = statusFilter;
    const raffles = await db.raffles.findMany({
      where: Object.keys(where).length ? where : {},
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    if (raffles.length === 0) {
      return NextResponse.json([]);
    }

    const raffleIds = raffles.map((r) => r.id);
    const createdByIds = [...new Set(raffles.map((r) => r.createdById).filter(Boolean))] as string[];
    const items = await db.ticketItems.findMany({ raffleIds });
    const ticketIds = [...new Set(items.map((i) => i.ticketId))];
    const ticketList = ticketIds.length ? await db.tickets.findManyByIds(ticketIds) : [];
    const ticketMap = Object.fromEntries(ticketList.map((t) => [t.id, t]));
    const userIds = [...new Set(ticketList.map((t) => t.userId))];
    const allUserIds = [...new Set([...createdByIds, ...userIds])];
    const userList = allUserIds.length ? await db.users.findManyByIds(allUserIds) : [];
    const userMap = Object.fromEntries(userList.map((u) => [u.id, u]));

    const formattedRaffles = raffles.map((raffle) => {
      const createdBy = raffle.createdById ? userMap[raffle.createdById] : null;
      const raffleItems = items.filter((i) => i.raffleId === raffle.id);
      const ticketItemsFormatted = raffleItems.map((item) => {
        const ticket = ticketMap[item.ticketId];
        const user = ticket ? userMap[ticket.userId] : null;
        return {
          id: item.id,
          value: item.value ?? "",
          status: item.status ?? null,
          ticket: { user: user ? { name: user.name, email: user.email } : null },
        };
      });
      return {
        id: raffle.id,
        title: raffle.title,
        description: raffle.description,
        type: raffle.type,
        pricePerSlot: Number(raffle.pricePerSlot) || 0,
        slots: raffle.slots || 0,
        status: raffle.status ?? "ACTIVE",
        approved: raffle.approved ?? false,
        mirrorMode: raffle.mirrorMode ?? false,
        ticketItems: ticketItemsFormatted,
        prizes: Array.isArray(raffle.prizes) ? raffle.prizes : [],
        winnersCount: raffle.winnersCount ?? 0,
        startsAt: raffle.startsAt ? raffle.startsAt.toISOString() : null,
        closesAt: raffle.closesAt ? raffle.closesAt.toISOString() : null,
        executedAt: raffle.executedAt ? raffle.executedAt.toISOString() : null,
        createdAt: raffle.createdAt ? raffle.createdAt.toISOString() : null,
        createdBy: createdBy ? { name: createdBy.name } : null,
      };
    });

    return NextResponse.json(formattedRaffles);
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      const token = getTokenFromRequest(request);
      const isPublic = !token;
      if (isPublic) {
        logger.info("[Raffles API] DB no disponible, devolviendo vacío");
        return NextResponse.json([], { status: 200, headers: { "x-fallback": "db-unavailable" } });
      }
      return NextResponse.json({ error: "Base de datos no disponible" }, { status: 503 });
    }
    logger.error("Error al obtener sorteos", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Error al obtener sorteos" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, CREATOR_ROLES);
    const userExists = await db.users.findById(auth.userId);
    if (!userExists) {
      return NextResponse.json(
        { error: "Tu sesión ya no es válida (usuario no encontrado). Cierra sesión e inicia sesión de nuevo." },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = raffleCreateSchema.safeParse(body);
    if (!parsed.success) {
      const issues = parsed.error.errors.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: issues || "Datos inválidos" }, { status: 400 });
    }

    const raffleId = newId();
    await db.raffles.create({
      id: raffleId,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      type: parsed.data.type as DrawType,
      pricePerSlot: parsed.data.pricePerSlot,
      slots: parsed.data.slots,
      winnersCount: parsed.data.winnersCount,
      mirrorMode: parsed.data.mirrorMode ?? false,
      startsAt: parsed.data.startsAt ?? null,
      closesAt: parsed.data.closesAt ?? null,
      prizes: parsed.data.prizes,
      status: "ACTIVE",
      createdById: auth.userId,
    });

    const raffle = await db.raffles.findById(raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Error al crear sorteo" }, { status: 500 });
    }

    if (CREATOR_ROLES.includes(auth.role)) {
      const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      await db.auditLog.create({
        id: newId(),
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
          pricePerSlot: String(raffle.pricePerSlot),
          slots: raffle.slots,
          winnersCount: raffle.winnersCount,
          mirrorMode: raffle.mirrorMode,
          prizes: raffle.prizes,
          startsAt: raffle.startsAt?.toISOString() ?? null,
          closesAt: raffle.closesAt?.toISOString() ?? null,
          status: raffle.status,
        },
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
