import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET() {
  try {
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
    return NextResponse.json({ error: "Error al obtener datos de pago móvil" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.MASTER]);
    
    const contentType = request.headers.get("content-type");
    let imageUrl: string | undefined;
    let cedula: string | undefined;
    let telefono: string | undefined;
    let destino: string | undefined;

    if (contentType?.includes("multipart/form-data")) {
      // Actualizar imagen
      const formData = await request.formData();
      const file = formData.get("image") as File | null;

      if (!file) {
        return NextResponse.json({ error: "No se proporcionó una imagen" }, { status: 400 });
      }

      // Validar formato (debe ser imagen)
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: "El archivo debe ser una imagen" }, { status: 400 });
      }

      // Convertir a base64 para almacenamiento temporal
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const base64 = buffer.toString("base64");
      imageUrl = `data:${file.type};base64,${base64}`;
    } else {
      // Actualizar datos (cedula, telefono, destino)
      const body = await request.json();
      cedula = body.cedula;
      telefono = body.telefono;
      destino = body.destino;
    }

    // Guardar o actualizar
    let paymentMobile = await prisma.paymentMobile.findFirst();
    
    const updateData: any = {
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
      paymentMobile = await prisma.paymentMobile.update({
        where: { id: paymentMobile.id },
        data: updateData
      });
    } else {
      paymentMobile = await prisma.paymentMobile.create({
        data: {
          imageUrl: imageUrl || "",
          cedula: cedula || null,
          telefono: telefono || null,
          destino: destino || null,
          updatedById: auth.userId
        }
      });
    }

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
    console.error("Error al actualizar pago móvil:", err);
    return NextResponse.json({ error: "Error al actualizar datos de pago móvil" }, { status: 500 });
  }
}

