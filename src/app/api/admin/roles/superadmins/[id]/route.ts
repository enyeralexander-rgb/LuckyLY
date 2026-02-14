import { NextResponse } from "next/server";
import * as db from "../../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../../lib/auth";
import { newId } from "../../../../../../lib/id";
import type { Role } from "../../../../../../lib/db-types";

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = requireAuth(request, ["MASTER"] as Role[]);
    const superadmin = await db.users.findById(params.id);
    if (!superadmin || superadmin.role !== "SUPERADMIN") {
      return NextResponse.json({ error: "Superadmin no encontrado" }, { status: 404 });
    }
    if (superadmin.id === auth.userId) {
      return NextResponse.json({ error: "No puedes borrarte a ti mismo" }, { status: 400 });
    }

    await db.users.deleteById(params.id);

    await db.auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "DELETE_SUPERADMIN",
      entity: "User",
      entityId: params.id,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al borrar superadmin" }, { status: 500 });
  }
}
