import { NextResponse } from "next/server";
import { ticketItems, tickets, users, auditLog, raffles, approvalEmailTemplate } from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import type { Role } from "../../../../../../lib/db-types";
import { newId } from "../../../../../../lib/id";
import { sendTicketApprovalEmail } from "../../../../../../lib/email";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id: itemId } = await params;

    const item = await ticketItems.findById(itemId);
    if (!item) {
      return NextResponse.json({ error: "Cupo no encontrado" }, { status: 404 });
    }
    if (item.status !== "PENDING") {
      return NextResponse.json({ error: "Este cupo ya fue procesado" }, { status: 400 });
    }

    const ticket = await tickets.findById(item.ticketId);
    const raffle = await raffles.findById(item.raffleId);
    if (!ticket || !raffle) {
      return NextResponse.json({ error: "Datos del ticket o sorteo no encontrados" }, { status: 404 });
    }

    await ticketItems.update(itemId, { status: "CONFIRMED" });

    const allItems = await ticketItems.findMany({ ticketId: item.ticketId });
    const allConfirmed = allItems.every((i) => i.status === "CONFIRMED");
    if (allConfirmed) {
      await tickets.update(item.ticketId, { status: "CONFIRMED" });

      // Send approval email to user (fire-and-forget)
      const ticketUser = await users.findById(ticket.userId);
      if (ticketUser?.email) {
        const templateBody = await approvalEmailTemplate.getBody();
        sendTicketApprovalEmail(
          ticketUser.email,
          ticketUser.name,
          raffle.title,
          allItems.map((i) => ({ value: i.value })),
          templateBody
        ).catch(() => {}); // Don't block response on email failure
      }
    }

    const user = await users.findById(ticket.userId);
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "CONFIRM_PENDING_SLOT",
      entity: "TicketItem",
      entityId: itemId,
      ip,
      meta: {
        raffleId: item.raffleId,
        raffleTitle: raffle.title,
        value: item.value,
        userId: ticket.userId,
        userName: user?.name ?? "N/A",
        userEmail: user?.email ?? "N/A",
        ticketId: item.ticketId,
        paymentMobileRef: ticket.paymentMobileRef ?? null,
        action: "APROBADO",
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al confirmar cupo" }, { status: 500 });
  }
}
