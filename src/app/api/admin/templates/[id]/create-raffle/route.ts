import { NextResponse } from "next/server";
import * as db from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { logger } from "../../../../../../lib/logger";
import { newId } from "../../../../../../lib/id";
import { createRaffleFromTemplateSchema } from "../../../../../../lib/validators";
import type { Role } from "../../../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id } = await params;
    const body = await request.json();
    const parsed = createRaffleFromTemplateSchema.safeParse(body);
    if (!parsed.success) {
      const message = parsed.error.errors.map((e) => e.path.join(".") + ": " + e.message).join("; ");
      return NextResponse.json({ error: message || "Datos inválidos" }, { status: 400 });
    }
    const { title, description, startsAt, closesAt, autoExecute } = parsed.data;

    const template = await db.raffleTemplate.findById(id);
    if (!template) {
      return NextResponse.json({ error: "Plantilla no encontrada" }, { status: 404 });
    }

    const raffleId = newId();
    await db.raffles.create({
      id: raffleId,
      title,
      description: description || template.description || null,
      type: template.type,
      pricePerSlot: template.pricePerSlot,
      slots: template.slots,
      winnersCount: template.winnersCount,
      mirrorMode: template.mirrorMode,
      prizes: template.prizes ?? undefined,
      status: "ACTIVE",
      startsAt: startsAt ? new Date(startsAt) : null,
      closesAt: closesAt ? new Date(closesAt) : null,
      autoExecute: autoExecute === true,
      templateId: template.id,
      createdById: auth.userId,
    });
    const raffle = await db.raffles.findById(raffleId);
    if (!raffle) {
      return NextResponse.json({ error: "Error al crear sorteo" }, { status: 500 });
    }
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "CREATE_RAFFLE_FROM_TEMPLATE",
      entity: "Raffle",
      entityId: raffle.id,
      ip,
      meta: { templateId: id, title: raffle.title, templateName: template.name },
    });
    return NextResponse.json(raffle, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al crear sorteo desde plantilla", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al crear sorteo desde plantilla" }, { status: 500 });
  }
}
