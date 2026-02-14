import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { homePageConfig } from "../../../../lib/db";
import { isDatabaseConnectionError } from "../../../../lib/dbErrors";
import { logger } from "../../../../lib/logger";

const DEFAULT_PUBLIC_CONFIG = {
  heroImages: ["/images/ruleta-fortuna-hero.jpg"],
  heroTitle: "Participa en la ruleta en vivo",
  heroSubtitle: "Cinco categorías: Números, Animales, Estados, Banderas y Signos Zodiacales. Compra cupos, mira la ruleta y cobra tu premio.",
  heroEffect: "fade",
  heroEffectParams: {},
  heroAutoSlide: false,
  heroAutoSlideMode: "linear",
  heroAutoSlideInterval: 5000,
  heroPauseOnHover: false,
  heroScrollFade: true,
  heroOpacity: 0.8,
  heroBlur: 4.0,
  heroTextColor: null,
  heroSubtitleColor: null,
  heroOverlayColor: null,
  heroOverlayOpacity: 0.7,
  heroImageSize: "contain",
  instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
  headerConfig: null,
  contactConfig: null,
  footerConfig: null,
  sectionOrder: ["hero", "raffles", "results", "live", "footer"],
  sectionVisibility: {
    hero: true,
    raffles: true,
    results: true,
    live: true,
    contact: false,
    footer: true,
  },
};

export async function GET(request: Request) {
  try {
    logger.info("[Public Homepage API] Solicitando configuración pública");
    const config = await homePageConfig.findFirst({ orderBy: { updatedAt: "desc" } });

    if (config) {
      logger.info("[Public Homepage API] Configuración encontrada", {
        heroOpacity: config.heroOpacity,
        heroBlur: config.heroBlur,
        heroOverlayOpacity: config.heroOverlayOpacity,
      });
    }

    if (!config) {
      return NextResponse.json(DEFAULT_PUBLIC_CONFIG, {
        headers: { "Cache-Control": "public, max-age=60" },
      });
    }

    const out = { ...config };
    if (out.heroImages && Array.isArray(out.heroImages)) {
      out.heroImages = out.heroImages.slice(0, 5);
    }

    return NextResponse.json(out, {
      headers: { "Cache-Control": "public, max-age=60" },
    });
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      logger.info("[Public Homepage API] DB no disponible, usando fallback");
      return NextResponse.json(DEFAULT_PUBLIC_CONFIG, { status: 200, headers: { "x-fallback": "db-unavailable" } });
    }

    logger.error("Error al obtener configuración pública", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}
