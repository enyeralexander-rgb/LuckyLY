import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { Role } from "@prisma/client";
import bcrypt from "bcryptjs";

/**
 * Endpoint temporal para crear/actualizar el usuario MASTER
 * Solo funciona en desarrollo o con una clave secreta en producción
 * 
 * Uso: POST /api/setup/create-master
 * Body: { "secret": "YOUR_SECRET_KEY" } (opcional, solo en producción)
 */
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    // En producción, requerir una clave secreta
    if (process.env.NODE_ENV === "production") {
      const body = await request.json().catch(() => ({}));
      const secret = process.env.MASTER_SETUP_SECRET || "CHANGE_THIS_IN_PRODUCTION";
      
      if (body.secret !== secret) {
        return NextResponse.json(
          { error: "No autorizado. Se requiere clave secreta." },
          { status: 401 }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    // CREDENCIALES DEL ADMINISTRADOR MASTER
    // ══════════════════════════════════════════════════════════════
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const documentId = "V-00000001";
    // ══════════════════════════════════════════════════════════════

    const existingMaster = await prisma.user.findUnique({
      where: { email }
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      // Actualizar el usuario existente
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          suspended: false,
          documentId: existingMaster.documentId || documentId
        }
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER actualizado",
        email
      });
    } else {
      // Crear nuevo administrador MASTER
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: "Administrador Master",
          username: "master",
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          documentId
        }
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER creado",
        email
      });
    }
  } catch (error) {
    console.error("Error al crear/actualizar usuario MASTER:", error);
    return NextResponse.json(
      { error: "Error al crear/actualizar usuario MASTER", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// También permitir GET para facilitar la ejecución
export async function GET(request: Request) {
  try {
    // En producción, requerir una clave secreta
    if (process.env.NODE_ENV === "production") {
      const url = new URL(request.url);
      const secret = url.searchParams.get("secret");
      const requiredSecret = process.env.MASTER_SETUP_SECRET || "CHANGE_THIS_IN_PRODUCTION";
      
      if (secret !== requiredSecret) {
        return NextResponse.json(
          { error: "No autorizado. Se requiere clave secreta en la URL: ?secret=YOUR_SECRET" },
          { status: 401 }
        );
      }
    }

    // ══════════════════════════════════════════════════════════════
    // CREDENCIALES DEL ADMINISTRADOR MASTER
    // ══════════════════════════════════════════════════════════════
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const documentId = "V-00000001";
    // ══════════════════════════════════════════════════════════════

    const existingMaster = await prisma.user.findUnique({
      where: { email }
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          suspended: false,
          documentId: existingMaster.documentId || documentId
        }
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER actualizado",
        email
      });
    } else {
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: "Administrador Master",
          username: "master",
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          documentId
        }
      });

      return NextResponse.json({
        success: true,
        message: "Administrador MASTER creado",
        email
      });
    }
  } catch (error) {
    console.error("Error al crear/actualizar usuario MASTER:", error);
    return NextResponse.json(
      { error: "Error al crear/actualizar usuario MASTER", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
