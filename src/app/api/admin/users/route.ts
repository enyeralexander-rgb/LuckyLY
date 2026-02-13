import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    
    // Parámetros de búsqueda
    const search = searchParams.get("search") || "";
    const searchName = searchParams.get("name") || "";
    const searchEmail = searchParams.get("email") || "";
    const searchCedula = searchParams.get("cedula") || "";
    const searchTelefono = searchParams.get("telefono") || "";
    const searchBanco = searchParams.get("banco") || "";
    const searchFecha = searchParams.get("fecha") || "";
    
    // Parámetros de paginación
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Construir filtros
    const where: any = {
      role: "USER"
    };

    // Búsqueda general (busca en nombre, email, cédula, teléfono, banco)
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { nationalId: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { bank: { contains: search, mode: "insensitive" } }
      ];
    } else {
      // Búsquedas específicas
      if (searchName) {
        where.name = { contains: searchName, mode: "insensitive" };
      }
      if (searchEmail) {
        where.email = { contains: searchEmail, mode: "insensitive" };
      }
      if (searchCedula) {
        where.nationalId = { contains: searchCedula, mode: "insensitive" };
      }
      if (searchTelefono) {
        where.phoneNumber = { contains: searchTelefono, mode: "insensitive" };
      }
      if (searchBanco) {
        where.bank = { contains: searchBanco, mode: "insensitive" };
      }
      if (searchFecha) {
        // Buscar por fecha de registro (formato: YYYY-MM-DD)
        const fechaInicio = new Date(searchFecha);
        fechaInicio.setHours(0, 0, 0, 0);
        const fechaFin = new Date(searchFecha);
        fechaFin.setHours(23, 59, 59, 999);
        where.createdAt = {
          gte: fechaInicio,
          lte: fechaFin
        };
      }
    }

    // Obtener total de usuarios (para paginación)
    const total = await prisma.user.count({ where });

    // Obtener usuarios con paginación
    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        documentId: true,
        phoneNumber: true,
        nationalId: true,
        nationalIdType: true,
        bank: true,
        suspended: true,
        suspendedReason: true,
        createdAt: true
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener usuarios", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
