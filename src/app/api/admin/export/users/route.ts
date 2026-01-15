import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";
import { exportUsers } from "../../../../../lib/export";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    
    const users = await prisma.user.findMany({
      where: { role: "USER" },
      orderBy: { createdAt: "desc" },
    });

    const buffer = await exportUsers(users);

    return new NextResponse(buffer, {
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
