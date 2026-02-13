import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
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
  sectionOrder: ["hero", "raffles", "live", "footer"],
  sectionVisibility: {
    hero: true,
    raffles: true,
    live: true,
    footer: true
  }
};

export async function GET(request: Request) {
  try {
    logger.info("[Public Homepage API] Solicitando configuración pública");
    const config = await prisma.homePageConfig.findFirst({
      orderBy: { updatedAt: "desc" },
      select: {
        heroImages: true,
        heroTitle: true,
        heroSubtitle: true,
        heroEffect: true,
        heroEffectParams: true,
        heroAutoSlide: true,
        heroAutoSlideMode: true,
        heroAutoSlideInterval: true,
        heroPauseOnHover: true,
        heroScrollFade: true,
        heroOpacity: true,
        heroBlur: true,
        heroTextColor: true,
        heroSubtitleColor: true,
        heroOverlayColor: true,
        heroOverlayOpacity: true,
        heroImageSize: true,
        instagramVideoUrl: true,
        headerConfig: true,
        contactConfig: true,
        footerConfig: true,
        sectionOrder: true,
        sectionVisibility: true
      }
    });

    if (config) {
      logger.info("[Public Homepage API] Configuración encontrada", {
        heroOpacity: config.heroOpacity,
        heroBlur: config.heroBlur,
        heroOverlayOpacity: config.heroOverlayOpacity
      });
    }

    // Configuración por defecto si no existe
    if (!config) {
      return NextResponse.json(DEFAULT_PUBLIC_CONFIG);
    }

    // Limitar imágenes a 5
    if (config.heroImages && Array.isArray(config.heroImages)) {
      config.heroImages = config.heroImages.slice(0, 5);
    }

    return NextResponse.json(config);
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      logger.info("[Public Homepage API] DB no disponible, usando fallback");
      return NextResponse.json(DEFAULT_PUBLIC_CONFIG, { status: 200, headers: { "x-fallback": "db-unavailable" } });
    }

    logger.error("Error al obtener configuración pública", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}
