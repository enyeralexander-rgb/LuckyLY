import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.CONTABLE, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    
    // Filtros
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const linkId = searchParams.get("linkId");
    const country = searchParams.get("country");
    const getCountries = searchParams.get("getCountries") === "true"; // Para obtener lista de países únicos
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {};

    // Filtro por fecha
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    // Filtro por link de referencia
    if (linkId) {
      where.referralLinkId = linkId;
    }

    // Filtro por país
    if (country && country !== "all" && country !== "") {
      where.country = country;
    }

    // Si se solicita solo la lista de países únicos
    if (getCountries) {
      const uniqueCountries = await prisma.referralVisit.findMany({
        where: {
          country: { not: null }
        },
        select: {
          country: true
        },
        distinct: ["country"]
      });
      
      const countriesList = uniqueCountries
        .map(v => v.country)
        .filter((c): c is string => c !== null)
        .sort();
      
      return NextResponse.json({ countries: countriesList });
    }

    // Obtener visitas con información del link
    const [visits, filteredTotal] = await Promise.all([
      prisma.referralVisit.findMany({
        where,
        include: {
          referralLink: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        skip,
        take: limit
      }),
      prisma.referralVisit.count({ where })
    ]);

    // Formatear datos
    const referralVisits = visits.map(visit => ({
      id: visit.id,
      fecha: visit.createdAt.toISOString(),
      nombreLink: visit.referralLink?.name || "Link eliminado",
      codigoLink: visit.referralLink?.code || "N/A",
      direccionIP: visit.ip || "N/A",
      pais: visit.country || "N/A", // Usar el país almacenado en la base de datos
      userAgent: visit.userAgent || "N/A",
      registrado: visit.registered,
      comprado: visit.purchased
    }));

    return NextResponse.json({
      visits: referralVisits,
      pagination: {
        page,
        limit,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / limit)
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener lista de referencias:", err);
    return NextResponse.json({ error: "Error al obtener lista de referencias" }, { status: 500 });
  }
}
