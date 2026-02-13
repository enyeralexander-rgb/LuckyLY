"use client";

import type { HomePageConfig } from "../types";

type HeroLivePreviewProps = {
  config: HomePageConfig;
};

/**
 * Vista previa en vivo del Hero: muestra la primera imagen con opacidad, blur y overlay actuales.
 * No usa iframe; refleja los cambios al instante.
 */
export function HeroLivePreview({ config }: HeroLivePreviewProps) {
  const firstImage = config.heroImages?.[0] ?? "/images/ruleta-fortuna-hero.jpg";
  const opacity = (config.heroOpacity ?? 80) / 100;
  const blurPx = (config.heroBlur ?? 0) * 4;
  const overlayOpacity = (config.heroOverlayOpacity ?? 70) / 100;
  const overlayColor = config.heroOverlayColor ?? "#0b1221";
  const objectFit = config.heroImageSize === "cover" ? "cover" : config.heroImageSize === "auto" ? "contain" : "contain";

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "180px",
        borderRadius: "8px",
        overflow: "hidden",
        border: "1px solid var(--border-color)",
        background: "#1a1a1a",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `url(${firstImage})`,
          backgroundSize: objectFit,
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          opacity,
          filter: blurPx > 0 ? `blur(${blurPx}px)` : undefined,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: overlayColor,
          opacity: overlayOpacity,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          left: "0.5rem",
          right: "0.5rem",
          fontSize: "0.75rem",
          color: "rgba(255,255,255,0.9)",
          textShadow: "0 1px 2px rgba(0,0,0,0.8)",
        }}
      >
        Vista previa en vivo (opacidad, desenfoque, overlay)
      </div>
    </div>
  );
}
