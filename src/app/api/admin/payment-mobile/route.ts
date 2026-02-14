import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import { Role } from "@prisma/client";
import { put } from "@vercel/blob";

export async function GET(request: Request) {
  try {
    // GET no requiere auth — datos públicos para mostrar al usuario
    const paymentMobile = await prisma.paymentMobile.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    
    return NextResponse.json({ 
      imageUrl: paymentMobile?.imageUrl || null,
      cedula: paymentMobile?.cedula || null,
      telefono: paymentMobile?.telefono || null,
      destino: paymentMobile?.destino || null
    });
  } catch (err) {
    logger.error("Error al obtener datos de pago móvil", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener datos de pago móvil" }, { status: 500 });
  }
}

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    
    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string | undefined;
    let cedula: string | undefined;
    let telefono: string | undefined;
    let destino: string | undefined;

    if (contentType.includes("multipart/form-data")) {
      // ── Subida de imagen via Vercel Blob ──
      const formData = await request.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No se proporcionó una imagen" }, { status: 400 });
      }

      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
      }

      const blob = await put(`payment-mobile/${Date.now()}-${file.name}`, file, {
        access: "public",
        addRandomSuffix: true,
      });
      imageUrl = blob.url;

      // Leer también campos de texto del FormData si vienen incluidos
      const cedulaForm = formData.get("cedula");
      const telefonoForm = formData.get("telefono");
      const destinoForm = formData.get("destino");
      
      if (cedulaForm !== null) cedula = cedulaForm.toString();
      if (telefonoForm !== null) telefono = telefonoForm.toString();
      if (destinoForm !== null) destino = destinoForm.toString();
    } else {
      // ── Guardar datos de texto (cedula, telefono, destino) ──
      const body = await request.json();
      cedula = body.cedula;
      telefono = body.telefono;
      destino = body.destino;
    }

    // Buscar el registro más reciente (igual que en GET) para asegurar que editamos el que se muestra
    let paymentMobile = await prisma.paymentMobile.findFirst({
      orderBy: { updatedAt: "desc" }
    });
    
    const updateData: Record<string, unknown> = {
      updatedById: auth.userId
    };

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl;
    }
    if (cedula !== undefined) {
      updateData.cedula = cedula || null;
    }
    if (telefono !== undefined) {
      updateData.telefono = telefono || null;
    }
    if (destino !== undefined) {
      updateData.destino = destino || null;
    }

    if (paymentMobile) {
      // Actualizar registro existente
      paymentMobile = await prisma.paymentMobile.update({
        where: { id: paymentMobile.id },
        data: updateData
      });
    } else {
      // Crear nuevo registro — imageUrl es ahora nullable
      paymentMobile = await prisma.paymentMobile.create({
        data: {
          imageUrl: imageUrl || null,
          cedula: cedula || null,
          telefono: telefono || null,
          destino: destino || null,
          updatedById: auth.userId
        }
      });
    }

    // Auditoría
    await prisma.auditLog.create({
      data: {
        actorId: auth.userId,
        actorRole: auth.role,
        action: "UPDATE_PAYMENT_MOBILE",
        entity: "PaymentMobile",
        entityId: paymentMobile.id,
        meta: {
          updatedFields: Object.keys(updateData).filter(k => k !== "updatedById")
        }
      }
    });

    return NextResponse.json({ 
      imageUrl: paymentMobile.imageUrl,
      cedula: paymentMobile.cedula,
      telefono: paymentMobile.telefono,
      destino: paymentMobile.destino
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar pago móvil", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar datos de pago móvil" }, { status: 500 });
  }
}
