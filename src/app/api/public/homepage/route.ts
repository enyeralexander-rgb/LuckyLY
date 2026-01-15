import { NextResponse } from "next/server";
import { prisma } from "../../../../lib/prisma";

export async function GET(request: Request) {
  try {
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

    // Configuración por defecto si no existe
    if (!config) {
      return NextResponse.json({
        heroImages: ["/images/ruleta-fortuna-hero.jpg"],
        heroTitle: "Participa en la ruleta en vivo",
        heroSubtitle: "Cinco categorías: Números, Animales, Estados, Banderas y Signos Zodiacales. Compra cupos, mira la ruleta y cobra tu premio.",
        heroEffect: "fade",
        heroEffectParams: {},
        heroAutoSlide: false,
        heroAutoSlideMode: "linear",
        heroAutoSlideInterval: 5000,
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
        sectionOrder: ["header", "hero", "raffles", "live", "footer"],
        sectionVisibility: {
          header: true,
          hero: true,
          raffles: true,
          live: true,
          footer: true
        }
      });
    }

    // Limitar imágenes a 5
    if (config.heroImages && Array.isArray(config.heroImages)) {
      config.heroImages = config.heroImages.slice(0, 5);
    }

    return NextResponse.json(config);
  } catch (err) {
    console.error("Error al obtener configuración pública:", err);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}
