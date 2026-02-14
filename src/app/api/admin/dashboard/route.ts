import { NextResponse } from "next/server";
import { raffles, prizeClaims, users } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { getContabilidadGlobal } from "../../../../lib/accounting";
import type { Role } from "../../../../lib/db-types";

const ROLES: Role[] = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const isSuperOrMaster = auth.role === "SUPERADMIN" || auth.role === "MASTER";

    const [contabilidadHoy, activeRaffles, finishedRaffles, pendingClaims, totalUsers] = await Promise.all([
      isSuperOrMaster ? getContabilidadGlobal({ dateStart: today, dateEnd: tomorrow }) : Promise.resolve({ ingresos: 0, egresos: 0, ganancias: 0 }),
      raffles.count({ status: "ACTIVE" }),
      raffles.count({ status: "FINISHED" }),
      prizeClaims.count({ status: ["REQUESTED", "PROCESSING"] }),
      isSuperOrMaster ? users.count({ role: "USER" }) : Promise.resolve(0),
    ]);

    const todayIncome = isSuperOrMaster ? contabilidadHoy.ingresos : 0;

    return NextResponse.json({
      todayIncome: Number(todayIncome.toFixed(2)),
      activeRaffles: activeRaffles || 0,
      finishedRaffles: finishedRaffles || 0,
      pendingClaims: pendingClaims || 0,
      totalUsers: totalUsers || 0,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener dashboard" }, { status: 500 });
  }
}
