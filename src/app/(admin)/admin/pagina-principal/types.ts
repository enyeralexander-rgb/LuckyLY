/**
 * Tipos y constantes del módulo Página Principal (admin).
 * HomePageConfig en formato UI: opacidades 0–100, blur 0–5.
 */

export type ImageFile = {
  name: string;
  url: string;
  type: "image" | "video";
};

export type HomePageConfig = {
  id?: string;
  heroImages: string[];
  heroAutoSlide: boolean;
  heroAutoSlideMode: string;
  heroAutoSlideInterval: number;
  heroPauseOnHover: boolean;
  heroImageSize?: string;
  instagramVideoUrl: string | null;
  heroEffect: string | null;
  heroEffectParams: Record<string, unknown> | null;
  heroScrollFade: boolean;
  /** UI: 0–100 (API usa 0–1) */
  heroOpacity: number;
  /** UI: 0–5 (API usa float 0–1 escalado) */
  heroBlur: number;
  heroTextColor: string | null;
  heroSubtitleColor: string | null;
  heroOverlayColor: string | null;
  /** UI: 0–100 (API usa 0–1) */
  heroOverlayOpacity: number;
};

export const MAX_HERO_IMAGES = 5;
export const DEFAULT_HERO_IMAGE = "/images/ruleta-fortuna-hero.jpg";
export const UPLOAD_MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
export const AUTO_SLIDE_INTERVAL_MIN = 2000;
export const AUTO_SLIDE_INTERVAL_MAX = 15000;
export const AUTO_SLIDE_INTERVAL_STEP = 500;

export const AUTO_SLIDE_MODES: { value: string; label: string }[] = [
  { value: "none", label: "Ninguno" },
  { value: "linear", label: "Lineal (Izquierda a Derecha)" },
  { value: "reverse", label: "Reverso (Derecha a Izquierda)" },
  { value: "fade", label: "Desvanecimiento" },
  { value: "zoom", label: "Zoom In/Out" },
  { value: "slide-up", label: "Deslizar Hacia Arriba" },
  { value: "slide-down", label: "Deslizar Hacia Abajo" },
];

export const HERO_EFFECTS: { value: string; label: string }[] = [
  { value: "fade", label: "Desvanecimiento (Fade)" },
  { value: "slide", label: "Deslizamiento (Slide)" },
  { value: "parallax", label: "Parallax" },
  { value: "fade-in-reveal", label: "Revelación con Desvanecimiento" },
  { value: "zoom-in-out", label: "Zoom In/Out" },
];

export const HERO_IMAGE_SIZES: { value: string; label: string }[] = [
  { value: "contain", label: "Contener (Mostrar imagen completa - Recomendado)" },
  { value: "cover", label: "Cubrir (Llenar todo el espacio, puede recortar)" },
  { value: "auto", label: "Autoajustar (Imagen completa visible, responsive)" },
];

export type HomePageValidationErrors = {
  heroImages?: string;
  heroAutoSlideInterval?: string;
  instagramVideoUrl?: string;
};

export function validateHomePageConfig(config: HomePageConfig): HomePageValidationErrors {
  const errors: HomePageValidationErrors = {};
  if (!config.heroImages?.length) {
    errors.heroImages = "Debe haber al menos una imagen en el carrusel.";
  }
  if (
    config.heroAutoSlideInterval != null &&
    (config.heroAutoSlideInterval < AUTO_SLIDE_INTERVAL_MIN ||
      config.heroAutoSlideInterval > AUTO_SLIDE_INTERVAL_MAX)
  ) {
    errors.heroAutoSlideInterval = `El intervalo debe estar entre ${AUTO_SLIDE_INTERVAL_MIN / 1000} y ${AUTO_SLIDE_INTERVAL_MAX / 1000} segundos.`;
  }
  const url = config.instagramVideoUrl?.trim();
  if (url && url.startsWith("http")) {
    try {
      new URL(url);
    } catch {
      errors.instagramVideoUrl = "Introduce una URL de Instagram válida.";
    }
  }
  return errors;
}

export const DEFAULT_CONFIG: HomePageConfig = {
  heroImages: [DEFAULT_HERO_IMAGE],
  heroAutoSlide: false,
  heroAutoSlideMode: "linear",
  heroAutoSlideInterval: 5000,
  heroPauseOnHover: false,
  heroImageSize: "contain",
  instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
  heroEffect: "fade",
  heroEffectParams: {},
  heroScrollFade: true,
  heroOpacity: 80,
  heroBlur: 0,
  heroTextColor: null,
  heroSubtitleColor: null,
  heroOverlayColor: null,
  heroOverlayOpacity: 70,
};
