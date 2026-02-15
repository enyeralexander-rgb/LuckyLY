import { NextResponse } from "next/server";
import * as db from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { exportUsers } from "@/lib/export";
import type { Role } from "@/lib/db-types";

const ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const users = await db.users.findMany({ where: { role: "USER" }, take: 50000, orderBy: { createdAt: "desc" } });
    const buffer = await exportUsers(users);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="usuarios_${new Date().toISOString().split("T")[0]}.xlsx"`,
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al exportar usuarios" }, { status: 500 });
  }
}
