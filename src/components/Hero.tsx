"use client";
import { useEffect, useState } from "react";

type HomePageConfig = {
  heroImages: string[];
  heroTitle: string | null;
  heroSubtitle: string | null;
  heroEffect: string | null;
  heroEffectParams: Record<string, any> | null;
  heroAutoSlide: boolean;
  heroAutoSlideMode: string;
  heroAutoSlideInterval: number;
  heroScrollFade: boolean;
  heroOpacity: number;
  heroBlur: number;
  heroTextColor: string | null;
  heroSubtitleColor: string | null;
  heroOverlayColor: string | null;
  heroOverlayOpacity: number;
  heroImageSize?: string; // "cover" | "contain" | "auto"
};

export function Hero() {
  const [config, setConfig] = useState<HomePageConfig>({
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
    heroImageSize: "contain"
  });
  const [opacity, setOpacity] = useState(1);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Primero verificar si hay configuración de preview en sessionStorage
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig) {
          setConfig({
            heroImages: Array.isArray(previewConfig.heroImages) ? previewConfig.heroImages.slice(0, 5) : [previewConfig.heroImages || "/images/ruleta-fortuna-hero.jpg"].filter(Boolean).slice(0, 5),
            heroTitle: previewConfig.heroTitle || "Participa en la ruleta en vivo",
            heroSubtitle: previewConfig.heroSubtitle || "Cinco categorías: Números, Animales, Estados, Banderas y Objetos. Compra cupos, mira la ruleta y cobra tu premio.",
            heroEffect: previewConfig.heroEffect || "fade",
            heroEffectParams: previewConfig.heroEffectParams || {},
            heroAutoSlide: previewConfig.heroAutoSlide ?? false,
            heroAutoSlideMode: previewConfig.heroAutoSlideMode || "linear",
            heroAutoSlideInterval: previewConfig.heroAutoSlideInterval || 5000,
            heroScrollFade: previewConfig.heroScrollFade ?? true,
            heroOpacity: previewConfig.heroOpacity !== undefined ? previewConfig.heroOpacity : 0.8,
            heroBlur: previewConfig.heroBlur !== undefined ? previewConfig.heroBlur : 4.0,
            heroTextColor: previewConfig.heroTextColor || null,
            heroSubtitleColor: previewConfig.heroSubtitleColor || null,
            heroOverlayColor: previewConfig.heroOverlayColor || null,
            heroOverlayOpacity: previewConfig.heroOverlayOpacity !== undefined ? previewConfig.heroOverlayOpacity : 0.7,
            heroImageSize: previewConfig.heroImageSize || "contain"
          });
          return; // No cargar desde API si hay preview config
        }
      } catch (err) {
        console.error("Error parsing preview config:", err);
      }
    }
    
    // Si no hay preview config, cargar desde API
    fetch("/api/public/homepage")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) {
          setConfig({
            heroImages: Array.isArray(data.heroImages) ? data.heroImages.slice(0, 5) : [data.heroImages || "/images/ruleta-fortuna-hero.jpg"].filter(Boolean).slice(0, 5),
            heroTitle: data.heroTitle || "Participa en la ruleta en vivo",
            heroSubtitle: data.heroSubtitle || "Cinco categorías: Números, Animales, Estados, Banderas y Objetos. Compra cupos, mira la ruleta y cobra tu premio.",
            heroEffect: data.heroEffect || "fade",
            heroEffectParams: data.heroEffectParams || {},
            heroAutoSlide: data.heroAutoSlide ?? false,
            heroAutoSlideMode: data.heroAutoSlideMode || "linear",
            heroAutoSlideInterval: data.heroAutoSlideInterval || 5000,
            heroScrollFade: data.heroScrollFade ?? true,
            heroOpacity: data.heroOpacity !== undefined ? data.heroOpacity : 0.8,
            heroBlur: data.heroBlur !== undefined ? data.heroBlur : 4.0,
            heroTextColor: data.heroTextColor || null,
            heroSubtitleColor: data.heroSubtitleColor || null,
            heroOverlayColor: data.heroOverlayColor || null,
            heroOverlayOpacity: data.heroOverlayOpacity !== undefined ? data.heroOverlayOpacity : 0.7,
            heroImageSize: data.heroImageSize || "contain"
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar configuración:", err);
      });
  }, []);

  useEffect(() => {
    if (!config.heroScrollFade) {
      setOpacity(1);
      return;
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const maxScroll = 300;
      const newOpacity = Math.max(0, 1 - scrollY / maxScroll);
      setOpacity(newOpacity);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [config.heroScrollFade]);

  useEffect(() => {
    if (!config.heroAutoSlide || config.heroImages.length <= 1 || config.heroAutoSlideMode === "none") return;

    const getNextIndex = (current: number): number => {
      const mode = config.heroAutoSlideMode || "linear";
      switch (mode) {
        case "reverse":
          return current === 0 ? config.heroImages.length - 1 : current - 1;
        case "linear":
        default:
          return (current + 1) % config.heroImages.length;
      }
    };

    // Usar un intervalo más largo para que las transiciones se vean mejor
    const intervalTime = Math.max(config.heroAutoSlideInterval || 5000, 2000);
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => getNextIndex(prev));
    }, intervalTime);

    return () => clearInterval(interval);
  }, [config.heroAutoSlide, config.heroAutoSlideMode, config.heroAutoSlideInterval, config.heroImages.length]);

  const currentImage = config.heroImages[currentImageIndex] || config.heroImages[0];
  const textColor = config.heroTextColor || "#e2e8f0";
  const subtitleColor = config.heroSubtitleColor || "#cbd5e1";
  const overlayColor = config.heroOverlayColor || "#0b1221";
  const overlayOpacity = config.heroOverlayOpacity ?? 0.7;

  const hexToRgba = (hex: string, alpha: number) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const imageSize = config.heroImageSize || "contain";
  
  // Determinar backgroundSize según el modo seleccionado
  const getBackgroundSize = () => {
    if (imageSize === "auto") {
      // Autoajustar: llenar todo el espacio sin dejar vacíos, preservando proporciones
      // Usa cover para llenar completamente el espacio (puede recortar ligeramente)
      return "cover";
    }
    return imageSize; // "contain" o "cover"
  };
  
  const backgroundSize = getBackgroundSize();
  const getEffectStyle = () => {
    // Para "auto": usar cover para llenar todo el espacio sin vacíos
    const finalBackgroundSize = imageSize === "auto" 
      ? "cover" // Llena todo el espacio sin dejar vacíos
      : backgroundSize;
    
    const baseStyle: React.CSSProperties = {
      position: "absolute",
      inset: 0,
      backgroundImage: `url(${currentImage})`,
      backgroundSize: finalBackgroundSize,
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      minHeight: "100%",
      height: "100%",
      filter: `blur(${config.heroBlur / 5}px)`, // Convert 0-100 to 0-20px
      opacity: 1.0,
      zIndex: 0,
      backgroundColor: imageSize === "contain" ? "#1a1a1a" : "transparent"
    };

    const effectParams = config.heroEffectParams || {};
    const duration = effectParams.duration || 1000;
    const speed = effectParams.speed || 1;

    switch (config.heroEffect) {
      case "slide":
        return {
          ...baseStyle,
          transition: `transform ${duration}ms ease-in-out`,
          transform: `translateX(${-currentImageIndex * 100}%)`
        };
      case "parallax":
        return {
          ...baseStyle,
          backgroundAttachment: "fixed",
          transform: `scale(${1 + (effectParams.intensity || 0.1)})`
        };
      case "fade-in-reveal":
        return {
          ...baseStyle,
          transition: `opacity ${duration}ms ease-out`,
          opacity: opacity * (config.heroOpacity ?? 0.8),
          filter: `blur(${config.heroBlur / 5}px)`
        };
      case "zoom-in-out":
        const scale = effectParams.scale || 1.2;
        const trigger = effectParams.trigger || 0.5;
        const scrollProgress = Math.min(window.scrollY / (window.innerHeight * trigger), 1);
        return {
          ...baseStyle,
          transform: `scale(${1 + (scale - 1) * scrollProgress})`,
          transition: "transform 0.1s ease-out"
        };
      default:
        return {
          ...baseStyle,
          transition: `opacity ${duration}ms ease-in-out`,
          opacity: config.heroOpacity ?? 0.8,
          filter: `blur(${config.heroBlur / 5}px)`
        };
    }
  };

  return (
    <section 
      style={{ 
        position: "relative", 
        width: "100%", 
        minHeight: "calc(100vh - 80px)",
        height: "calc(100vh - 80px)",
        maxHeight: "none",
        overflow: "hidden",
        opacity: config.heroScrollFade ? opacity : 1.0,
        transition: "opacity 0.3s ease-out",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        margin: 0,
        padding: 0
      }}
    >
      {config.heroEffect === "slide" && config.heroImages.length > 1 ? (
        <div style={{ position: "absolute", inset: 0, display: "flex", width: `${config.heroImages.length * 100}%` }}>
          {config.heroImages.map((img, index) => {
            const slideMode = config.heroAutoSlideMode || "linear";
            let transform = `translateX(${-currentImageIndex * 100}%)`;
            // Usar una duración de transición más suave (30% del intervalo total, mínimo 500ms, máximo 2000ms)
            const transitionDuration = Math.min(Math.max((config.heroAutoSlideInterval || 5000) * 0.3, 500), 2000);
            let transition = `transform ${transitionDuration}ms ease-in-out`;
            
            if (config.heroAutoSlide && slideMode === "fade") {
              transition = `opacity ${transitionDuration}ms ease-in-out`;
            } else if (config.heroAutoSlide && slideMode === "zoom") {
              transform = `translateX(${-currentImageIndex * 100}%) scale(${index === currentImageIndex ? 1.1 : 1})`;
              transition = `transform ${transitionDuration}ms ease-in-out, opacity ${transitionDuration}ms ease-in-out`;
            } else if (config.heroAutoSlide && slideMode === "slide-up") {
              transform = `translateY(${-currentImageIndex * 100}%)`;
            } else if (config.heroAutoSlide && slideMode === "slide-down") {
              transform = `translateY(${currentImageIndex * 100}%)`;
            }
            
            // Para "auto": usar cover para llenar todo el espacio sin vacíos
            const slideBackgroundSize = imageSize === "auto" 
              ? "cover" // Llena todo el espacio sin dejar vacíos
              : backgroundSize;
            
            return (
              <div
                key={index}
                style={{
                  width: `${100 / config.heroImages.length}%`,
                  backgroundImage: `url(${img})`,
                  backgroundSize: slideBackgroundSize,
                  backgroundPosition: "center",
                  backgroundRepeat: "no-repeat",
                  minHeight: "100%",
                  height: "100%",
                  filter: `blur(${config.heroBlur / 5}px)`, // Convert 0-100 to 0-20px
                  backgroundColor: imageSize === "contain" ? "#0a0a0a" : "transparent",
                  opacity: config.heroAutoSlide && slideMode === "fade" 
                    ? (index === currentImageIndex ? 1.0 : 0)
                    : 1.0,
                  transition,
                  transform
                }}
              />
            );
          })}
        </div>
      ) : (
        <div style={getEffectStyle()} />
      )}
      
      <div 
        style={{
          position: "absolute",
          inset: 0,
          background: config.heroOverlayColor 
            ? `linear-gradient(135deg, ${hexToRgba(overlayColor, overlayOpacity)} 0%, ${hexToRgba(overlayColor, overlayOpacity * 0.9)} 100%)`
            : `linear-gradient(135deg, rgba(11, 18, 33, ${overlayOpacity}) 0%, rgba(31, 41, 55, ${overlayOpacity * 0.9}) 100%)`,
          zIndex: 1
        }}
      />
    </section>
  );
}
