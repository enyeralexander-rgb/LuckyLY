import { NextResponse } from "next/server";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import { newId } from "../../../../../lib/id";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(request, ROLES);
    const { id } = await params;
    const link = await db.referralLink.findById(id);
    if (!link) {
      return NextResponse.json({ error: "Link de referido no encontrado" }, { status: 404 });
    }

    await db.referralLink.deleteById(id);

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "DELETE_REFERRAL_LINK",
      entity: "ReferralLink",
      entityId: id,
      meta: { code: link.code, name: link.name },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al eliminar link de referido", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al eliminar link de referido" }, { status: 500 });
  }
}
