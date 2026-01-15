import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
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

    const [todayTickets, activeRaffles, finishedRaffles, pendingClaims, totalUsers] = await Promise.all([
      // Solo calcular ingresos si es SUPERADMIN o MASTER
      isSuperOrMaster
        ? prisma.ticket.findMany({
            where: {
              purchasedAt: { gte: today, lt: tomorrow }
            },
            select: { totalPaid: true }
          })
        : Promise.resolve([]),
      prisma.raffle.count({ where: { status: "ACTIVE" } }),
      prisma.raffle.count({ where: { status: "FINISHED" } }),
      prisma.prizeClaim.count({ where: { status: { in: ["REQUESTED", "PROCESSING"] } } }),
      isSuperOrMaster
        ? prisma.user.count({ where: { role: "USER" } })
        : Promise.resolve(0)
    ]);

    const todayIncome = isSuperOrMaster 
      ? todayTickets.reduce((sum, t) => sum + (Number(t.totalPaid) || 0), 0)
      : 0;

    return NextResponse.json({
      todayIncome: todayIncome || 0,
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

