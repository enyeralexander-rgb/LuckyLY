import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import type { Role, DrawType } from "@/lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(request, ROLES);
    const { id } = await params;

    const raffle = await db.raffles.findById(id);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    const ticketItems = await db.ticketItems.findMany({ raffleId: id });

    return NextResponse.json({
      id: raffle.id,
      title: raffle.title,
      description: raffle.description,
      type: raffle.type,
      pricePerSlot: Number(raffle.pricePerSlot) || 0,
      slots: raffle.slots,
      winnersCount: raffle.winnersCount,
      mirrorMode: raffle.mirrorMode ?? false,
      status: raffle.status,
      approved: raffle.approved,
      startsAt: raffle.startsAt ? new Date(raffle.startsAt).toISOString() : null,
      prizes: raffle.prizes,
      ticketItems: ticketItems.map((item) => ({
        id: item.id,
        value: item.value,
        status: item.status,
      })),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener el sorteo" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    requireAuth(request, ROLES);
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const raffle = await db.raffles.findById(id);
    if (!raffle) {
      return NextResponse.json({ error: "Sorteo no encontrado" }, { status: 404 });
    }

    const ticketItems = await db.ticketItems.findMany({ raffleId: id });
    const hasConfirmed = ticketItems.some((t) => t.status === "CONFIRMED");
    if (hasConfirmed) {
      return NextResponse.json(
        { error: "No se puede editar un sorteo que ya tiene cupos confirmados" },
        { status: 400 }
      );
    }

    const title = typeof body.title === "string" ? body.title.trim() : undefined;
    const description = body.description !== undefined ? (body.description === null ? null : String(body.description)) : undefined;
    const type = typeof body.type === "string" && ["NUMBERS", "ANIMALS", "STATES", "FLAGS", "ZODIAC"].includes(body.type) ? (body.type as DrawType) : undefined;
    const pricePerSlot = typeof body.pricePerSlot === "number" ? body.pricePerSlot : typeof body.pricePerSlot === "string" ? parseFloat(body.pricePerSlot) : undefined;
    const winnersCount = typeof body.winnersCount === "number" ? body.winnersCount : undefined;
    const mirrorMode = typeof body.mirrorMode === "boolean" ? body.mirrorMode : undefined;
    const prizes = body.prizes !== undefined ? body.prizes : undefined;
    const startsAt = body.startsAt !== undefined && body.startsAt !== null ? new Date(body.startsAt) : body.startsAt === null ? null : undefined;

    if (!title && description === undefined && type === undefined && pricePerSlot === undefined && winnersCount === undefined && mirrorMode === undefined && prizes === undefined && startsAt === undefined) {
      return NextResponse.json({ error: "No hay campos válidos para actualizar" }, { status: 400 });
    }

    const updateData: Parameters<typeof db.raffles.updateEditable>[1] = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (type !== undefined) updateData.type = type;
    if (pricePerSlot !== undefined && !Number.isNaN(pricePerSlot)) updateData.pricePerSlot = pricePerSlot;
    if (winnersCount !== undefined) updateData.winnersCount = winnersCount;
    if (mirrorMode !== undefined) updateData.mirrorMode = mirrorMode;
    if (prizes !== undefined) updateData.prizes = prizes;
    if (startsAt !== undefined) updateData.startsAt = startsAt;

    await db.raffles.updateEditable(id, updateData);
    const updated = await db.raffles.findById(id);
    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al actualizar el sorteo" }, { status: 500 });
  }
}
