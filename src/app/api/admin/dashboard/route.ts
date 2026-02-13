import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { getContabilidadGlobal } from "../../../../lib/accounting";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.CONTABLE, Role.SUPERADMIN, Role.MASTER]);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isSuperOrMaster = auth.role === Role.SUPERADMIN || auth.role === Role.MASTER;
    const isContable = auth.role === Role.CONTABLE;

    const [contabilidadHoy, activeRaffles, finishedRaffles, pendingClaims, totalUsers] = await Promise.all([
      isSuperOrMaster
        ? getContabilidadGlobal({ dateStart: today, dateEnd: tomorrow })
        : Promise.resolve({ ingresos: 0, egresos: 0, ganancias: 0 }),
      prisma.raffle.count({ where: { status: "ACTIVE" } }),
      prisma.raffle.count({ where: { status: "FINISHED" } }),
      prisma.prizeClaim.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
      isSuperOrMaster
        ? prisma.user.count({ where: { role: "USER" } })
        : Promise.resolve(0)
    ]);

    const todayIncome = isSuperOrMaster ? contabilidadHoy.ingresos : 0;

    return NextResponse.json({
      todayIncome: Number(todayIncome.toFixed(2)),
      activeRaffles: activeRaffles || 0,
      finishedRaffles: finishedRaffles || 0,
      pendingClaims: pendingClaims || 0,
      totalUsers: totalUsers || 0
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener dashboard" }, { status: 500 });
  }
}

