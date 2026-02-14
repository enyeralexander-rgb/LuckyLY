import { NextResponse } from "next/server";
import { paymentMobile, auditLog } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";
import { put } from "@vercel/blob";

const MASTER: Role = "MASTER";

export async function GET(request: Request) {
  try {
    const payment = await paymentMobile.findFirst({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json({
      imageUrl: payment?.imageUrl || null,
      cedula: payment?.cedula || null,
      telefono: payment?.telefono || null,
      destino: payment?.destino || null,
    });
  } catch (err) {
    logger.error("Error al obtener datos de pago móvil", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener datos de pago móvil" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const auth = requireAuth(request, [MASTER]);

    const contentType = request.headers.get("content-type") || "";
    let imageUrl: string | undefined;
    let cedula: string | undefined;
    let telefono: string | undefined;
    let destino: string | undefined;

    if (contentType.includes("multipart/form-data")) {
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

      const cedulaForm = formData.get("cedula");
      const telefonoForm = formData.get("telefono");
      const destinoForm = formData.get("destino");
      if (cedulaForm !== null) cedula = cedulaForm.toString();
      if (telefonoForm !== null) telefono = telefonoForm.toString();
      if (destinoForm !== null) destino = destinoForm.toString();
    } else {
      const body = await request.json();
      if (typeof body.imageUrl === "string" && body.imageUrl.trim().startsWith("http")) {
        imageUrl = body.imageUrl.trim();
      }
      cedula = body.cedula;
      telefono = body.telefono;
      destino = body.destino;
    }

    let payment = await paymentMobile.findFirst({ orderBy: { updatedAt: "desc" } });

    const updatePayload: Partial<{ imageUrl: string | null; cedula: string | null; telefono: string | null; destino: string | null; updatedById: string | null }> = { updatedById: auth.userId };
    if (imageUrl !== undefined) updatePayload.imageUrl = imageUrl;
    if (cedula !== undefined) updatePayload.cedula = cedula || null;
    if (telefono !== undefined) updatePayload.telefono = telefono || null;
    if (destino !== undefined) updatePayload.destino = destino || null;

    if (payment) {
      payment = await paymentMobile.update(payment.id, updatePayload);
    } else {
      payment = await paymentMobile.create({
        id: newId(),
        imageUrl: imageUrl ?? null,
        cedula: cedula ?? null,
        telefono: telefono ?? null,
        destino: destino ?? null,
        updatedById: auth.userId,
      });
    }

    await auditLog.create({
      id: newId(),
      actorId: auth.userId,
      actorRole: auth.role,
      action: "UPDATE_PAYMENT_MOBILE",
      entity: "PaymentMobile",
      entityId: payment.id,
      meta: { updatedFields: Object.keys(updatePayload).filter((k) => k !== "updatedById") },
    });

    return NextResponse.json({
      imageUrl: payment.imageUrl,
      cedula: payment.cedula,
      telefono: payment.telefono,
      destino: payment.destino,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al actualizar pago móvil", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al actualizar datos de pago móvil" }, { status: 500 });
  }
}
