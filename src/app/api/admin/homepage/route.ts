import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { requireAuth, AuthError } from "../../../../lib/auth";
import { Role } from "@prisma/client";

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    
    let config = await prisma.homePageConfig.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    // Si no existe configuración, crear una por defecto
    if (!config) {
      config = await prisma.homePageConfig.create({
        data: {
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
          updatedById: auth.userId
        }
      });
    }

    return NextResponse.json(config);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al obtener configuración:", err);
    return NextResponse.json({ error: "Error al obtener configuración" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const auth = requireAuth(request, [Role.AGENT, Role.SUPERADMIN, Role.MASTER]);
    const body = await request.json();

    // Validar máximo 5 imágenes
    if (body.heroImages && Array.isArray(body.heroImages) && body.heroImages.length > 5) {
      return NextResponse.json({ error: "Máximo 5 imágenes permitidas" }, { status: 400 });
    }

    let config = await prisma.homePageConfig.findFirst({
      orderBy: { updatedAt: "desc" }
    });

    // Preparar solo los campos válidos del schema, sin usar spread operator
    const updateData: any = {};
    
    if (body.heroImages !== undefined) {
      if (Array.isArray(body.heroImages) && body.heroImages.length > 0) {
        updateData.heroImages = body.heroImages.slice(0, 5);
      } else if (body.heroImages) {
        updateData.heroImages = [body.heroImages];
      } else {
        updateData.heroImages = ["/images/ruleta-fortuna-hero.jpg"]; // Al menos una imagen por defecto
      }
    }
    if (body.heroEffect !== undefined) updateData.heroEffect = body.heroEffect || null;
    if (body.heroEffectParams !== undefined) updateData.heroEffectParams = body.heroEffectParams || {};
    if (body.heroAutoSlide !== undefined) updateData.heroAutoSlide = body.heroAutoSlide;
    if (body.heroAutoSlideMode !== undefined) updateData.heroAutoSlideMode = body.heroAutoSlideMode || null;
    if (body.heroAutoSlideInterval !== undefined) updateData.heroAutoSlideInterval = body.heroAutoSlideInterval;
    if (body.heroScrollFade !== undefined) updateData.heroScrollFade = body.heroScrollFade;
    if (body.heroOpacity !== undefined) updateData.heroOpacity = body.heroOpacity;
    if (body.heroBlur !== undefined) updateData.heroBlur = body.heroBlur;
    if (body.heroTextColor !== undefined) updateData.heroTextColor = body.heroTextColor || null;
    if (body.heroSubtitleColor !== undefined) updateData.heroSubtitleColor = body.heroSubtitleColor || null;
    if (body.heroOverlayColor !== undefined) updateData.heroOverlayColor = body.heroOverlayColor || null;
    if (body.heroOverlayOpacity !== undefined) updateData.heroOverlayOpacity = body.heroOverlayOpacity;
    if (body.heroImageSize !== undefined) updateData.heroImageSize = body.heroImageSize || "contain";
    if (body.instagramVideoUrl !== undefined) updateData.instagramVideoUrl = body.instagramVideoUrl || null;
    
    // NO permitir modificar sectionOrder ni sectionVisibility desde este módulo
    // El Header NO se puede modificar desde 'PAGINA PRINCIPAL'
    // Si se envía, se ignora y se mantiene null
    updateData.sectionOrder = null;
    updateData.sectionVisibility = null;
    
    updateData.updatedById = auth.userId;

    if (config) {
      // Actualizar configuración existente
      config = await prisma.homePageConfig.update({
        where: { id: config.id },
        data: updateData
      });
    } else {
      // Crear nueva configuración con valores por defecto
      config = await prisma.homePageConfig.create({
        data: {
          heroImages: updateData.heroImages || ["/images/ruleta-fortuna-hero.jpg"],
          heroEffect: updateData.heroEffect ?? "fade",
          heroEffectParams: updateData.heroEffectParams ?? {},
          heroAutoSlide: updateData.heroAutoSlide ?? false,
          heroAutoSlideMode: updateData.heroAutoSlideMode ?? "linear",
          heroAutoSlideInterval: updateData.heroAutoSlideInterval ?? 5000,
          heroScrollFade: updateData.heroScrollFade ?? true,
          heroOpacity: updateData.heroOpacity ?? 1.0,
          heroBlur: updateData.heroBlur ?? 0,
          heroTextColor: updateData.heroTextColor ?? null,
          heroSubtitleColor: updateData.heroSubtitleColor ?? null,
          heroOverlayColor: updateData.heroOverlayColor ?? null,
          heroOverlayOpacity: updateData.heroOverlayOpacity ?? 0.7,
          heroImageSize: updateData.heroImageSize ?? "contain",
          instagramVideoUrl: updateData.instagramVideoUrl ?? "/images/RULETA FONDO REDES.mp4",
          updatedById: auth.userId
        }
      });
    }

    return NextResponse.json(config);
  } catch (err: unknown) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("Error al actualizar configuración:", err);
    const errorMessage = err instanceof Error ? err.message : "Error desconocido al actualizar configuración";
    const errorDetails = err instanceof Error ? err.stack : String(err);
    console.error("Detalles del error:", errorDetails);
    return NextResponse.json({ 
      error: "Error al actualizar configuración",
      message: errorMessage,
      details: process.env.NODE_ENV === "development" ? errorDetails : undefined
    }, { status: 500 });
  }
}
