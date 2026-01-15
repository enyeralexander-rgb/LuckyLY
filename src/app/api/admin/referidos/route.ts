import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";
import { randomBytes } from "crypto";

// Obtener todos los links de referidos
export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const { searchParams } = new URL(request.url);
    const createdById = searchParams.get("createdById");

    const where: any = {};
    if (createdById) {
      where.createdById = createdById;
    }

    const links = await prisma.referralLink.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        visits: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json(links);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener links de referidos:", err);
    return NextResponse.json({ error: "Error al obtener links de referidos" }, { status: 500 });
  }
}

// Crear nuevo link de referido
export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre del link es requerido" }, { status: 400 });
    }

    // Generar código único
    let code: string;
    let exists = true;
    while (exists) {
      code = randomBytes(8).toString("hex");
      const existing = await prisma.referralLink.findUnique({ where: { code } });
      exists = !!existing;
    }

    const link = await prisma.referralLink.create({
      data: {
        code: code!,
        name: name.trim(),
        createdById: auth.userId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "CREATE_REFERRAL_LINK",
        entity: "ReferralLink",
        entityId: link.id,
        meta: { code: link.code, name: link.name }
      }
    });

    return NextResponse.json(link, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al crear link de referido:", err);
    return NextResponse.json({ error: "Error al crear link de referido" }, { status: 500 });
  }
}
