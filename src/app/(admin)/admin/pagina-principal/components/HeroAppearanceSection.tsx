"use client";

import { SectionCard } from "./SectionCard";
import { FormField } from "./FormField";
import type { HomePageConfig } from "../types";
import {
  AUTO_SLIDE_MODES,
  HERO_EFFECTS,
  HERO_IMAGE_SIZES,
  AUTO_SLIDE_INTERVAL_MIN,
  AUTO_SLIDE_INTERVAL_MAX,
} from "../types";

type HeroAppearanceSectionProps = {
  config: HomePageConfig;
  setConfig: React.Dispatch<React.SetStateAction<HomePageConfig>>;
  validationError?: string;
};

const inputBlockStyle: React.CSSProperties = {
  padding: "1rem",
  background: "var(--card-bg)",
  borderRadius: "8px",
  border: "1px solid var(--border-color)",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "0.5rem",
  color: "var(--text-primary)",
  fontWeight: 600,
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem",
  borderRadius: "8px",
  border: "1px solid var(--border-color)",
  background: "var(--card-bg)",
  color: "var(--text-primary)",
};

export function HeroAppearanceSection({ config, setConfig, validationError }: HeroAppearanceSectionProps) {
  return (
    <SectionCard title="🎨 Apariencia del Hero" collapsible storageKey="appearance">
      <div style={{ display: "grid", gap: "1.5rem" }}>
        <FormField
          id="hero-image-size"
          label="Tamaño de Imagen de Portada"
          hint={
            config.heroImageSize === "contain"
              ? "✓ La imagen se mostrará completa sin recortes"
              : config.heroImageSize === "cover"
                ? "⚠ La imagen puede recortarse para llenar todo el espacio"
                : "✓ Autoajustar: imagen completa sin recortar, adaptada al tamaño de pantalla (responsive)."
          }
        >
          <select
            id="hero-image-size"
            value={config.heroImageSize || "contain"}
            onChange={(e) => setConfig((c) => ({ ...c, heroImageSize: e.target.value }))}
            style={selectStyle}
          >
            {HERO_IMAGE_SIZES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Auto-slide */}
        <div style={{ ...inputBlockStyle, display: "grid", gap: "1rem" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.heroAutoSlide || false}
              onChange={(e) => setConfig((c) => ({ ...c, heroAutoSlide: e.target.checked }))}
            />
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>Deslizamiento Automático</span>
          </label>
          {config.heroAutoSlide && (
            <div style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={labelStyle}>Modo de Deslizamiento</label>
                <select
                  value={config.heroAutoSlideMode || "linear"}
                  onChange={(e) => setConfig((c) => ({ ...c, heroAutoSlideMode: e.target.value }))}
                  style={selectStyle}
                >
                  {AUTO_SLIDE_MODES.map((mode) => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "grid", gap: "0.75rem" }}>
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <label style={{ color: "var(--text-primary)", fontWeight: 600, minWidth: "120px" }} id="hero-interval-label">
                    Intervalo entre imágenes:
                  </label>
                  <input
                    type="range"
                    min={AUTO_SLIDE_INTERVAL_MIN}
                    max={AUTO_SLIDE_INTERVAL_MAX}
                    step="500"
                    value={config.heroAutoSlideInterval || 5000}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        heroAutoSlideInterval: parseInt(e.target.value, 10) || 5000,
                      }))
                    }
                    style={{ flex: "1 1 120px", minWidth: 0 }}
                    aria-labelledby="hero-interval-label"
                  />
                  <input
                    type="number"
                    min={AUTO_SLIDE_INTERVAL_MIN}
                    max={AUTO_SLIDE_INTERVAL_MAX}
                    step="500"
                    value={config.heroAutoSlideInterval || 5000}
                    onChange={(e) =>
                      setConfig((c) => ({
                        ...c,
                        heroAutoSlideInterval: Math.max(
                          AUTO_SLIDE_INTERVAL_MIN,
                          parseInt(e.target.value, 10) || 5000
                        ),
                      }))
                    }
                    style={{
                      width: "100px",
                      minWidth: "80px",
                      padding: "0.5rem",
                      borderRadius: "4px",
                      border: "1px solid var(--border-color)",
                      background: "var(--card-bg)",
                      color: "var(--text-primary)",
                    }}
                    aria-labelledby="hero-interval-label"
                  />
                  <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem" }}>ms</span>
                </div>
                <div style={{ fontSize: "0.875rem", color: "var(--text-tertiary)", paddingLeft: "120px" }}>
                  ⚡ Velocidad:{" "}
                  {config.heroAutoSlideInterval < 3000
                    ? "Muy Rápida"
                    : config.heroAutoSlideInterval < 5000
                      ? "Rápida"
                      : config.heroAutoSlideInterval < 8000
                        ? "Normal"
                        : "Lenta"}{" "}
                  (Recomendado: 5000-8000ms para mejor experiencia)
                </div>
                {validationError && (
                  <div style={{ fontSize: "0.875rem", color: "var(--color-error, #ef4444)", paddingLeft: "120px" }}>
                    {validationError}
                  </div>
                )}
              </div>
              <div
                style={{
                  padding: "1rem",
                  background: "var(--bg-accent)",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                }}
              >
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={config.heroPauseOnHover || false}
                    onChange={(e) => setConfig((c) => ({ ...c, heroPauseOnHover: e.target.checked }))}
                  />
                  <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
                    ⏸️ Pausar al pasar el mouse (Pause on Hover)
                  </span>
                </label>
                <div
                  style={{
                    marginTop: "0.5rem",
                    fontSize: "0.875rem",
                    color: "var(--text-tertiary)",
                    paddingLeft: "1.5rem",
                  }}
                >
                  {config.heroPauseOnHover
                    ? "✓ El carrusel se pausará cuando el usuario pase el mouse sobre él"
                    : "✗ El carrusel continuará deslizándose aunque el usuario pase el mouse"}
                </div>
              </div>
            </div>
          )}
        </div>

        <FormField
          label="Efecto Visual de la Imagen"
          hint={
            (config.heroEffect === "fade" && "✓ Transición suave entre imágenes") ||
            (config.heroEffect === "slide" && "✓ Deslizamiento horizontal entre imágenes") ||
            (config.heroEffect === "parallax" && "✓ Efecto parallax con movimiento") ||
            (config.heroEffect === "fade-in-reveal" && "✓ Revelación con desvanecimiento") ||
            (config.heroEffect === "zoom-in-out" && "✓ Zoom al hacer scroll") ||
            ""
          }
        >
          <select
            value={config.heroEffect || "fade"}
            onChange={(e) =>
              setConfig((c) => ({ ...c, heroEffect: e.target.value, heroEffectParams: {} }))
            }
            style={selectStyle}
          >
            {HERO_EFFECTS.map((effect) => (
              <option key={effect.value} value={effect.value}>
                {effect.label}
              </option>
            ))}
          </select>
        </FormField>

        {/* Scroll fade */}
        <div style={inputBlockStyle}>
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={config.heroScrollFade ?? true}
              onChange={(e) => setConfig((c) => ({ ...c, heroScrollFade: e.target.checked }))}
            />
            <span style={{ color: "var(--text-primary)", fontWeight: 600 }}>
              Desvanecimiento al hacer scroll
            </span>
          </label>
          <div
            style={{
              marginTop: "0.5rem",
              fontSize: "0.875rem",
              color: "var(--text-tertiary)",
              paddingLeft: "1.5rem",
            }}
          >
            {config.heroScrollFade
              ? "✓ El carrusel se desvanecerá al hacer scroll hacia abajo"
              : "✗ El carrusel permanecerá visible al hacer scroll"}
          </div>
        </div>

        {/* Opacity */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Opacidad de la Imagen de Portada</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={config.heroOpacity ?? 80}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({ ...c, heroOpacity: isNaN(val) ? 80 : val }));
              }}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={config.heroOpacity ?? 80}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({
                  ...c,
                  heroOpacity: isNaN(val) ? 80 : Math.max(0, Math.min(100, val)),
                }));
              }}
              style={{
                width: "80px",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
            <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", minWidth: "30px" }}>%</span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroOpacity === 0 && "Transparente (invisible)"}
            {config.heroOpacity > 0 && config.heroOpacity < 30 && "Muy transparente"}
            {config.heroOpacity >= 30 && config.heroOpacity < 60 && "Transparente"}
            {config.heroOpacity >= 60 && config.heroOpacity < 90 && "Semi-transparente"}
            {config.heroOpacity >= 90 && config.heroOpacity < 100 && "Casi opaco"}
            {config.heroOpacity === 100 && "Completamente opaco"}
          </div>
        </div>

        {/* Blur */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Desenfoque de la Imagen de Portada</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="range"
              min="0"
              max="5"
              step="1"
              value={config.heroBlur ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({ ...c, heroBlur: isNaN(val) ? 0 : val }));
              }}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="5"
              step="1"
              value={config.heroBlur ?? 0}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({
                  ...c,
                  heroBlur: isNaN(val) ? 0 : Math.max(0, Math.min(5, val)),
                }));
              }}
              style={{
                width: "80px",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroBlur === 0 && "Sin desenfoque (nítido)"}
            {config.heroBlur === 1 && "Desenfoque ligero"}
            {config.heroBlur === 2 && "Desenfoque moderado"}
            {config.heroBlur === 3 && "Desenfoque fuerte"}
            {config.heroBlur >= 4 && "Desenfoque muy fuerte"}
          </div>
        </div>

        {/* Color título */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Color del Texto del Título</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="color"
              value={config.heroTextColor || "#e2e8f0"}
              onChange={(e) => setConfig((c) => ({ ...c, heroTextColor: e.target.value }))}
              style={{
                width: "60px",
                height: "40px",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            />
            <input
              type="text"
              value={config.heroTextColor || "#e2e8f0"}
              onChange={(e) =>
                setConfig((c) => ({ ...c, heroTextColor: e.target.value || null }))
              }
              placeholder="#e2e8f0"
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, heroTextColor: null }))}
              style={{
                padding: "0.5rem 1rem",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroTextColor
              ? `✓ Color personalizado: ${config.heroTextColor}`
              : "Usando color por defecto (#e2e8f0)"}
          </div>
        </div>

        {/* Color subtítulo */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Color del Texto del Subtítulo</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="color"
              value={config.heroSubtitleColor || "#cbd5e1"}
              onChange={(e) => setConfig((c) => ({ ...c, heroSubtitleColor: e.target.value }))}
              style={{
                width: "60px",
                height: "40px",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            />
            <input
              type="text"
              value={config.heroSubtitleColor || "#cbd5e1"}
              onChange={(e) =>
                setConfig((c) => ({ ...c, heroSubtitleColor: e.target.value || null }))
              }
              placeholder="#cbd5e1"
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, heroSubtitleColor: null }))}
              style={{
                padding: "0.5rem 1rem",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroSubtitleColor
              ? `✓ Color personalizado: ${config.heroSubtitleColor}`
              : "Usando color por defecto (#cbd5e1)"}
          </div>
        </div>

        {/* Color overlay */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Color del Overlay</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="color"
              value={config.heroOverlayColor || "#0b1221"}
              onChange={(e) => setConfig((c) => ({ ...c, heroOverlayColor: e.target.value }))}
              style={{
                width: "60px",
                height: "40px",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                cursor: "pointer",
              }}
            />
            <input
              type="text"
              value={config.heroOverlayColor || "#0b1221"}
              onChange={(e) =>
                setConfig((c) => ({ ...c, heroOverlayColor: e.target.value || null }))
              }
              placeholder="#0b1221"
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
            <button
              type="button"
              onClick={() => setConfig((c) => ({ ...c, heroOverlayColor: null }))}
              style={{
                padding: "0.5rem 1rem",
                background: "#6b7280",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Reset
            </button>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroOverlayColor
              ? `✓ Color personalizado: ${config.heroOverlayColor}`
              : "Usando color por defecto (#0b1221)"}
          </div>
        </div>

        {/* Overlay opacity */}
        <div style={inputBlockStyle}>
          <label style={labelStyle}>Opacidad del Overlay</label>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={config.heroOverlayOpacity ?? 70}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({ ...c, heroOverlayOpacity: isNaN(val) ? 70 : val }));
              }}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="100"
              step="1"
              value={config.heroOverlayOpacity ?? 70}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setConfig((c) => ({
                  ...c,
                  heroOverlayOpacity: isNaN(val) ? 70 : Math.max(0, Math.min(100, val)),
                }));
              }}
              style={{
                width: "80px",
                padding: "0.5rem",
                borderRadius: "4px",
                border: "1px solid var(--border-color)",
                background: "var(--card-bg)",
                color: "var(--text-primary)",
              }}
            />
            <span style={{ color: "var(--text-tertiary)", fontSize: "0.875rem", minWidth: "30px" }}>%</span>
          </div>
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
            {config.heroOverlayOpacity === 0 && "Sin overlay (transparente)"}
            {config.heroOverlayOpacity > 0 && config.heroOverlayOpacity < 30 && "Overlay muy transparente"}
            {config.heroOverlayOpacity >= 30 && config.heroOverlayOpacity < 60 && "Overlay semi-transparente"}
            {config.heroOverlayOpacity >= 60 && config.heroOverlayOpacity < 90 && "Overlay opaco"}
            {config.heroOverlayOpacity >= 90 && "Overlay muy opaco"}
          </div>
        </div>
      </div>
    </SectionCard>
  );
}
