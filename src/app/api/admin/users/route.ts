import { NextResponse } from "next/server";
import { users } from "@/lib/db";
import { requireAuth, AuthError } from "@/lib/auth";
import { logger } from "@/lib/logger";
import type { Role } from "@/lib/db-types";

const ADMIN_ROLES: Role[] = ["SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    requireAuth(request, ADMIN_ROLES);
    const { searchParams } = new URL(request.url);

    const search = searchParams.get("search") ?? "";
    const searchName = searchParams.get("name") ?? "";
    const searchEmail = searchParams.get("email") ?? "";
    const searchCedula = searchParams.get("cedula") ?? "";
    const searchTelefono = searchParams.get("telefono") ?? "";
    const searchBanco = searchParams.get("banco") ?? "";
    const searchFecha = searchParams.get("fecha") ?? "";

    const page = parseInt(searchParams.get("page") ?? "1", 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    let createdAtGte: Date | undefined;
    let createdAtLte: Date | undefined;
    if (searchFecha) {
      const fechaInicio = new Date(searchFecha);
      fechaInicio.setHours(0, 0, 0, 0);
      const fechaFin = new Date(searchFecha);
      fechaFin.setHours(23, 59, 59, 999);
      createdAtGte = fechaInicio;
      createdAtLte = fechaFin;
    }

    const [userList, total] = await Promise.all([
      users.findManyAdmin({
        search: search || undefined,
        name: searchName || undefined,
        email: searchEmail || undefined,
        nationalId: searchCedula || undefined,
        phoneNumber: searchTelefono || undefined,
        bank: searchBanco || undefined,
        createdAtGte,
        createdAtLte,
        skip,
        take: limit,
      }),
      users.countAdmin({
        search: search || undefined,
        name: searchName || undefined,
        email: searchEmail || undefined,
        nationalId: searchCedula || undefined,
        phoneNumber: searchTelefono || undefined,
        bank: searchBanco || undefined,
        createdAtGte,
        createdAtLte,
      }),
    ]);

    const list = userList.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      documentId: u.documentId,
      phoneNumber: u.phoneNumber,
      nationalId: u.nationalId,
      nationalIdType: u.nationalIdType,
      bank: u.bank,
      suspended: u.suspended,
      suspendedReason: u.suspendedReason,
      createdAt: u.createdAt,
    }));

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      users: list,
      pagination: { page, limit, total, totalPages },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener usuarios", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener usuarios" }, { status: 500 });
  }
}
