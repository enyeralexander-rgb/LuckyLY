"use client";

import { useState, useEffect, useCallback } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import type { HomePageConfig } from "../types";
import { DEFAULT_CONFIG, MAX_HERO_IMAGES } from "../types";

function normalizeFromApi(data: Record<string, unknown>): HomePageConfig {
  const heroImages = Array.isArray(data.heroImages)
    ? (data.heroImages as string[]).slice(0, MAX_HERO_IMAGES)
    : [typeof data.heroImages === "string" && data.heroImages ? data.heroImages : DEFAULT_CONFIG.heroImages[0]];
  return {
    id: typeof data.id === "string" ? data.id : undefined,
    heroImages: heroImages.length > 0 ? heroImages : DEFAULT_CONFIG.heroImages,
    heroAutoSlide: Boolean(data.heroAutoSlide),
    heroAutoSlideMode: typeof data.heroAutoSlideMode === "string" ? data.heroAutoSlideMode : "linear",
    heroAutoSlideInterval: typeof data.heroAutoSlideInterval === "number" ? data.heroAutoSlideInterval : 5000,
    heroPauseOnHover: Boolean(data.heroPauseOnHover),
    heroImageSize: typeof data.heroImageSize === "string" ? data.heroImageSize : "contain",
    instagramVideoUrl: typeof data.instagramVideoUrl === "string" ? data.instagramVideoUrl : "",
    heroEffect: typeof data.heroEffect === "string" ? data.heroEffect : "fade",
    heroEffectParams: data.heroEffectParams && typeof data.heroEffectParams === "object" ? (data.heroEffectParams as Record<string, unknown>) : {},
    heroScrollFade: data.heroScrollFade !== false,
    heroOpacity: typeof data.heroOpacity === "number" ? Math.round(data.heroOpacity * 100) : 80,
    heroBlur: typeof data.heroBlur === "number" ? Math.round(data.heroBlur * 5) : 0,
    heroTextColor: typeof data.heroTextColor === "string" ? data.heroTextColor : null,
    heroSubtitleColor: typeof data.heroSubtitleColor === "string" ? data.heroSubtitleColor : null,
    heroOverlayColor: typeof data.heroOverlayColor === "string" ? data.heroOverlayColor : null,
    heroOverlayOpacity: typeof data.heroOverlayOpacity === "number" ? Math.round(data.heroOverlayOpacity * 100) : 70,
  };
}

function buildPayload(config: HomePageConfig): Record<string, unknown> {
  return {
    heroImages: config.heroImages?.length ? config.heroImages.slice(0, MAX_HERO_IMAGES) : DEFAULT_CONFIG.heroImages,
    heroAutoSlide: config.heroAutoSlide ?? false,
    heroAutoSlideMode: config.heroAutoSlideMode || "linear",
    heroAutoSlideInterval: config.heroAutoSlideInterval ?? 5000,
    heroPauseOnHover: config.heroPauseOnHover ?? false,
    heroImageSize: config.heroImageSize || "contain",
    instagramVideoUrl: config.instagramVideoUrl || null,
    heroEffect: config.heroEffect || "fade",
    heroEffectParams: config.heroEffectParams || {},
    heroScrollFade: config.heroScrollFade ?? true,
    heroOpacity: (config.heroOpacity ?? 80) / 100,
    heroBlur: (config.heroBlur ?? 0) / 5,
    heroTextColor: config.heroTextColor || null,
    heroSubtitleColor: config.heroSubtitleColor || null,
    heroOverlayColor: config.heroOverlayColor || null,
    heroOverlayOpacity: (config.heroOverlayOpacity ?? 70) / 100,
    sectionOrder: null,
    sectionVisibility: null,
  };
}

export function useHomePageConfig() {
  const [config, setConfig] = useState<HomePageConfig>(DEFAULT_CONFIG);
  const [lastSavedConfig, setLastSavedConfig] = useState<HomePageConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadConfig = useCallback(async () => {
    const auth = getStoredAuth();
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      let data: { error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setError(res.ok ? "Error al cargar configuración" : `Error del servidor (${res.status})`);
        return;
      }
      if (!res.ok || data.error) {
        setError(data.error || `Error del servidor (${res.status})`);
        return;
      }
      const next = normalizeFromApi(data as Record<string, unknown>);
      setConfig(next);
      setLastSavedConfig(next);
    } catch (err) {
      console.error("Error cargando configuración:", err);
      setError(err instanceof Error ? err.message : "Error al cargar configuración");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const save = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    const auth = getStoredAuth();
    if (!auth?.token || saving) {
      return { ok: false, error: "No autenticado o ya guardando" };
    }
    if (config.heroImages.length === 0) {
      return { ok: false, error: "Debe haber al menos una imagen en el carrusel" };
    }
    if (config.heroImages.length > MAX_HERO_IMAGES) {
      return { ok: false, error: "Máximo 5 imágenes permitidas" };
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/homepage", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify(buildPayload(config)),
      });
      const data = await res.json();
      if (res.ok) {
        const next = normalizeFromApi(data);
        setConfig(next);
        setLastSavedConfig(next);
        return { ok: true };
      }
      const errorMsg = data.error || data.message || "No se pudo guardar la configuración";
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.error("Error al guardar:", err);
      setError(msg);
      return { ok: false, error: msg };
    } finally {
      setSaving(false);
    }
  }, [config, saving]);

  return { config, setConfig, lastSavedConfig, loading, error, save, saving, reload: loadConfig };
}
