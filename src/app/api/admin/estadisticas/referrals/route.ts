import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import * as db from "../../../../../lib/db";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { logger } from "../../../../../lib/logger";
import type { Role } from "../../../../../lib/db-types";

const ROLES: Role[] = ["CONTABLE", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ROLES);
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const linkId = searchParams.get("linkId");
    const country = searchParams.get("country");
    const getCountries = searchParams.get("getCountries") === "true";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    if (getCountries) {
      const allVisits = await db.referralVisit.findMany({ take: 50000 });
      const countriesSet = new Set<string>();
      allVisits.forEach((v) => {
        if (v.country) countriesSet.add(v.country);
      });
      return NextResponse.json({ countries: Array.from(countriesSet).sort() });
    }

    let createdAtGte: Date | undefined;
    let createdAtLte: Date | undefined;
    if (startDate) createdAtGte = new Date(startDate);
    if (endDate) {
      const end = new Date(endDate);
      end.setUTCHours(23, 59, 59, 999);
      createdAtLte = end;
    }

    let visits: Awaited<ReturnType<typeof db.referralVisit.findMany>>;
    if (linkId) {
      visits = await db.referralVisit.findMany({ where: { referralLinkId: linkId }, take: 50000 });
    } else if (createdAtGte != null && createdAtLte != null) {
      visits = await db.referralVisit.findMany({ where: { createdAtGte, createdAtLte }, take: 50000 });
    } else {
      visits = await db.referralVisit.findMany({ take: 50000 });
    }

    let filtered = visits;
    if (linkId) filtered = filtered.filter((v) => v.referralLinkId === linkId);
    if (country && country !== "all" && country !== "") filtered = filtered.filter((v) => v.country === country);
    if (createdAtGte) filtered = filtered.filter((v) => new Date(v.createdAt) >= createdAtGte!);
    if (createdAtLte) filtered = filtered.filter((v) => new Date(v.createdAt) <= createdAtLte!);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + limit);
    const linkIds = [...new Set(paginated.map((v) => v.referralLinkId))];
    const links = await Promise.all(linkIds.map((id) => db.referralLink.findById(id)));
    const linkMap = Object.fromEntries(links.filter(Boolean).map((l) => [l!.id, l!]));

    const referralVisits = paginated.map((visit) => ({
      id: visit.id,
      fecha: new Date(visit.createdAt).toISOString(),
      nombreLink: linkMap[visit.referralLinkId]?.name ?? "Link eliminado",
      codigoLink: linkMap[visit.referralLinkId]?.code ?? "N/A",
      direccionIP: visit.ip ?? "N/A",
      pais: visit.country ?? "N/A",
      userAgent: visit.userAgent ?? "N/A",
      registrado: visit.registered,
      comprado: visit.purchased,
    }));

    return NextResponse.json({
      visits: referralVisits,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener lista de referencias", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener lista de referencias" }, { status: 500 });
  }
}
