import { NextResponse } from "next/server";
import * as db from "../../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../../lib/auth";
import { newId } from "../../../../../../../lib/id";
import type { Role } from "../../../../../../../lib/db-types";

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["SUPERADMIN", "MASTER"] as Role[]);
    const agent = await db.users.findById(params.id);
    if (!agent || agent.role !== "AGENT") {
      return NextResponse.json({ error: "Agente no encontrado" }, { status: 404 });
    }

    await db.users.update(params.id, { role: "USER" });

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "SUSPEND_AGENT",
      entity: "User",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al suspender agente" }, { status: 500 });
  }
}
