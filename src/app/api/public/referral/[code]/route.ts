import { NextResponse } from "next/server";
import { prisma } from "../../../../../lib/prisma";
import { getCountryFromIP } from "../../../../../lib/geolocation";
import { logger } from "../../../../../lib/logger";

// Registrar visita a link de referido
export async function GET(request: Request, { params }: { params: { code: string } }) {
  try {
    const code = params.code;
    
    const link = await prisma.referralLink.findUnique({
      where: { code }
    });

    if (!link) {
      return NextResponse.json({ error: "Link de referido no encontrado" }, { status: 404 });
    }

    // Obtener IP y User-Agent
    const headersList = request.headers;
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Obtener país por geolocalización (no bloquea la respuesta si falla)
    let country: string | null = null;
    try {
      country = await getCountryFromIP(ip);
      // Si retorna "N/A", guardar como null
      if (country === "N/A") {
        country = null;
      }
    } catch (geoError) {
      // Silenciar errores de geolocalización
      logger.warn("Error en geolocalización (no crítico)", { error: geoError instanceof Error ? geoError.message : String(geoError) });
    }

    // Registrar visita
    await prisma.referralVisit.create({
      data: {
        referralLinkId: link.id,
        ip,
        userAgent,
        country
      }
    });

    // Actualizar contador de clicks
    await prisma.referralLink.update({
      where: { id: link.id },
      data: { clicks: { increment: 1 } }
    });

    // Redirigir a la página principal
    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    logger.error("Error al procesar link de referido", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.redirect(new URL("/", request.url));
  }
}
