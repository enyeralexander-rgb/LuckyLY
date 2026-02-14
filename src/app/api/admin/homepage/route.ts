import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
import { homePageConfig } from "../../../../lib/db";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { logger } from "../../../../lib/logger";
import type { Role } from "../../../../lib/db-types";
import { newId } from "../../../../lib/id";

const ROLES: Role[] = ["AGENT", "SUPERADMIN", "MASTER"];

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);

    let config = await homePageConfig.findFirst({ orderBy: { updatedAt: "desc" } });

    if (!config) {
      config = await homePageConfig.create({
        id: newId(),
        heroImages: ["/images/ruleta-fortuna-hero.jpg"],
        heroEffect: "fade",
        heroAutoSlide: false,
        heroAutoSlideMode: "linear",
        heroAutoSlideInterval: 5000,
        heroScrollFade: true,
        heroOpacity: 1.0,
        heroBlur: 0,
        heroTextColor: null,
        heroSubtitleColor: null,
        heroOverlayColor: null,
        heroOverlayOpacity: 0.7,
        heroImageSize: "contain",
        instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
        updatedById: auth.userId,
      });
    }

    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    logger.error("Error al obtener configuración", { error: err instanceof Error ? err.message : String(err) });
    const message =
      process.env.NODE_ENV === "development" && err instanceof Error ? err.message : "Error al obtener configuración";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, ROLES);
    const body = await request.json();

    logger.info("[Homepage API] Recibiendo actualización de configuración", {
      heroOpacity: body.heroOpacity,
      heroBlur: body.heroBlur,
      heroOverlayOpacity: body.heroOverlayOpacity,
    });

    if (body.heroImages && Array.isArray(body.heroImages) && body.heroImages.length > 5) {
      return NextResponse.json({ error: "Máximo 5 imágenes permitidas" }, { status: 400 });
    }

    let config = await homePageConfig.findFirst({ orderBy: { updatedAt: "desc" } });

    const updateData: Record<string, unknown> = {};
    if (body.heroImages !== undefined) {
      if (Array.isArray(body.heroImages) && body.heroImages.length > 0) {
        updateData.heroImages = body.heroImages.slice(0, 5);
      } else if (body.heroImages) {
        updateData.heroImages = [body.heroImages];
      } else {
        updateData.heroImages = ["/images/ruleta-fortuna-hero.jpg"];
      }
    }
    if (body.heroEffect !== undefined) updateData.heroEffect = body.heroEffect || null;
    if (body.heroEffectParams !== undefined) updateData.heroEffectParams = body.heroEffectParams ?? {};
    if (body.heroAutoSlide !== undefined) updateData.heroAutoSlide = body.heroAutoSlide;
    if (body.heroAutoSlideMode !== undefined) updateData.heroAutoSlideMode = body.heroAutoSlideMode || null;
    if (body.heroAutoSlideInterval !== undefined) updateData.heroAutoSlideInterval = body.heroAutoSlideInterval;
    if (body.heroPauseOnHover !== undefined) updateData.heroPauseOnHover = body.heroPauseOnHover;
    if (body.heroScrollFade !== undefined) updateData.heroScrollFade = body.heroScrollFade;
    if (body.heroOpacity !== undefined) updateData.heroOpacity = body.heroOpacity;
    if (body.heroBlur !== undefined) updateData.heroBlur = body.heroBlur;
    if (body.heroTextColor !== undefined) updateData.heroTextColor = body.heroTextColor || null;
    if (body.heroSubtitleColor !== undefined) updateData.heroSubtitleColor = body.heroSubtitleColor || null;
    if (body.heroOverlayColor !== undefined) updateData.heroOverlayColor = body.heroOverlayColor || null;
    if (body.heroOverlayOpacity !== undefined) updateData.heroOverlayOpacity = body.heroOverlayOpacity;
    if (body.heroImageSize !== undefined) updateData.heroImageSize = body.heroImageSize || "contain";
    if (body.instagramVideoUrl !== undefined) updateData.instagramVideoUrl = body.instagramVideoUrl || null;
    updateData.sectionOrder = null;
    updateData.sectionVisibility = null;
    updateData.updatedById = auth.userId;

    if (config) {
      config = await homePageConfig.update(config.id, updateData);
      logger.info("[Homepage API] Configuración actualizada exitosamente", {
        configId: config.id,
        heroOpacity: config.heroOpacity,
        heroBlur: config.heroBlur,
        heroOverlayOpacity: config.heroOverlayOpacity,
      });
    } else {
      config = await homePageConfig.create({
        id: newId(),
        heroImages: (updateData.heroImages as string[]) || ["/images/ruleta-fortuna-hero.jpg"],
        heroEffect: (updateData.heroEffect as string) ?? "fade",
        heroEffectParams: (updateData.heroEffectParams as object) ?? {},
        heroAutoSlide: (updateData.heroAutoSlide as boolean) ?? false,
        heroAutoSlideMode: (updateData.heroAutoSlideMode as string) ?? "linear",
        heroAutoSlideInterval: (updateData.heroAutoSlideInterval as number) ?? 5000,
        heroPauseOnHover: (updateData.heroPauseOnHover as boolean) ?? false,
        heroScrollFade: (updateData.heroScrollFade as boolean) ?? true,
        heroOpacity: (updateData.heroOpacity as number) ?? 1.0,
        heroBlur: (updateData.heroBlur as number) ?? 0,
        heroTextColor: (updateData.heroTextColor as string | null) ?? null,
        heroSubtitleColor: (updateData.heroSubtitleColor as string | null) ?? null,
        heroOverlayColor: (updateData.heroOverlayColor as string | null) ?? null,
        heroOverlayOpacity: (updateData.heroOverlayOpacity as number) ?? 0.7,
        heroImageSize: (updateData.heroImageSize as string) ?? "contain",
        instagramVideoUrl: (updateData.instagramVideoUrl as string | null) ?? "/images/RULETA FONDO REDES.mp4",
        updatedById: auth.userId,
      });
      logger.info("[Homepage API] Nueva configuración creada exitosamente");
    }

    return NextResponse.json(config);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar configuración";
    const errorDetails = err instanceof Error ? err.stack : String(err);
    logger.error("Error al actualizar configuración", {
      error: errorMessage,
      details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
    });
    return NextResponse.json(
      {
        error: "Error al actualizar configuración",
        message: errorMessage,
        details: process.env.NODE_ENV === "development" ? errorDetails : undefined,
      },
      { status: 500 }
    );
  }
}
