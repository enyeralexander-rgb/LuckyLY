import { NextResponse } from "next/server";
import { referralLink, referralVisit } from "../../../../../lib/db";
import { getCountryFromIP } from "../../../../../lib/geolocation";
import { logger } from "../../../../../lib/logger";
import { newId } from "../../../../../lib/id";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;

    const link = await referralLink.findUnique({ code });

    if (!link) {
      return NextResponse.json({ error: "Link de referido no encontrado" }, { status: 404 });
    }

    const headersList = request.headers;
    const ip = headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    let country: string | null = null;
    try {
      const c = await getCountryFromIP(ip);
      country = c === "N/A" ? null : c;
    } catch (geoError) {
      logger.warn("Error en geolocalización (no crítico)", { error: geoError instanceof Error ? geoError.message : String(geoError) });
    }

    await referralVisit.create({
      id: newId(),
      referralLinkId: link.id,
      ip,
      userAgent,
      country,
    });

    await referralLink.update(link.id, { clicks: (link.clicks ?? 0) + 1 });

    return NextResponse.redirect(new URL("/", request.url));
  } catch (err) {
    logger.error("Error al procesar link de referido", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.redirect(new URL("/", request.url));
  }
}
