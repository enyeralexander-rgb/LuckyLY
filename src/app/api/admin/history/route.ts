import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const day = searchParams.get("day");
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const type = searchParams.get("type");

    const where: any = {
      status: "FINISHED",
      executedAt: { not: null }
    };

    if (type) {
      where.type = type;
    }

    if (day || month || year) {
      where.executedAt = {};
      if (year) {
        const startDate = new Date(`${year}-01-01`);
        const endDate = new Date(`${year}-12-31`);
        where.executedAt.gte = startDate;
        where.executedAt.lte = endDate;
      }
      if (month && year) {
        const startDate = new Date(`${year}-${month.padStart(2, "0")}-01`);
        const endDate = new Date(`${year}-${month.padStart(2, "0")}-31`);
        where.executedAt.gte = startDate;
        where.executedAt.lte = endDate;
      }
      if (day && month && year) {
        const date = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`);
        where.executedAt.gte = new Date(date.setHours(0, 0, 0, 0));
        where.executedAt.lte = new Date(date.setHours(23, 59, 59, 999));
      }
    }

    const raffles = await prisma.raffle.findMany({
      where,
      orderBy: { executedAt: "desc" },
      take: 100
    });

    // Para cada sorteo obtener los usuarios ganadores (tickets que tienen items ganadores)
    const rafflesWithWinners = await Promise.all(
      raffles.map(async (r) => {
        const winningValues = r.winningItem
          ? r.winningItem.split(",").map((s: string) => s.trim()).filter(Boolean)
          : [];
        if (winningValues.length === 0) {
          return { ...r, winnerUsers: [] as { id: string; name: string; username: string | null }[] };
        }
        const items = await prisma.ticketItem.findMany({
          where: { raffleId: r.id, value: { in: winningValues } },
          include: {
            ticket: {
              include: {
                user: { select: { id: true, name: true, username: true } }
              }
            }
          }
        });
        const seen = new Set<string>();
        const winnerUsers = items
          .filter((i) => {
            const uid = i.ticket.user.id;
            if (seen.has(uid)) return false;
            seen.add(uid);
            return true;
          })
          .map((i) => ({
            id: i.ticket.user.id,
            name: i.ticket.user.name,
            username: i.ticket.user.username
          }));
        return { ...r, winnerUsers };
      })
    );

    return NextResponse.json(rafflesWithWinners);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al obtener historial" }, { status: 500 });
  }
}

