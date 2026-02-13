"use client";

import { useState } from "react";
import { SectionCard } from "./SectionCard";
import type { HomePageConfig, ImageFile } from "../types";

type InstagramVideoSectionProps = {
  config: HomePageConfig;
  setConfig: React.Dispatch<React.SetStateAction<HomePageConfig>>;
  availableImages: ImageFile[];
  onUploadMedia: (file: File) => Promise<void>;
  validationError?: string;
};

export function InstagramVideoSection({
  config,
  setConfig,
  availableImages,
  onUploadMedia,
  validationError,
}: InstagramVideoSectionProps) {
  const [showVideoSelector, setShowVideoSelector] = useState(false);

  return (
    <SectionCard title="📸 LINK A INSTAGRAM" collapsible storageKey="instagram">
      <div style={{ marginBottom: "1.5rem" }}>
        <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>
          Enlace a Instagram (URL)
        </label>
        <input
          type="url"
          value={config.instagramVideoUrl || ""}
          onChange={(e) => setConfig((c) => ({ ...c, instagramVideoUrl: e.target.value }))}
          placeholder="https://www.instagram.com/tu_cuenta"
          style={{
            width: "100%",
            padding: "0.75rem",
            borderRadius: "8px",
            border: "1px solid var(--border-color)",
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            fontSize: "1rem",
          }}
        />
        <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
          Ingresa el enlace a tu perfil o publicación de Instagram, o selecciona/sube un archivo de imagen o video
        </small>
        {validationError && (
          <div style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "var(--color-error, #ef4444)" }}>
            {validationError}
          </div>
        )}
      </div>

      <div>
        <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600 }}>
          Archivo Seleccionado (Opcional)
        </label>
        {config.instagramVideoUrl && !config.instagramVideoUrl.startsWith("http") && (
          <div style={{ marginBottom: "0.75rem", display: "flex", gap: "0.5rem", alignItems: "center", padding: "0.75rem", background: "var(--card-bg)", borderRadius: "8px" }}>
            {config.instagramVideoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video src={config.instagramVideoUrl} style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border-color)" }} muted loop playsInline />
            ) : (
              <img src={config.instagramVideoUrl} alt="Archivo seleccionado" style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "4px", border: "1px solid var(--border-color)" }} />
            )}
            <div style={{ flex: 1, fontSize: "0.875rem", color: "var(--text-primary)", wordBreak: "break-all" }}>{config.instagramVideoUrl}</div>
            <button type="button" onClick={() => setConfig((c) => ({ ...c, instagramVideoUrl: "" }))} style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>✖</button>
          </div>
        )}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button type="button" onClick={() => setShowVideoSelector(!showVideoSelector)} style={{ padding: "0.75rem 1.5rem", background: "#2a8c4a", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600 }}>
            {showVideoSelector ? "✖ Cerrar Selector" : "📁 SELECCIONAR ARCHIVO"}
          </button>
          <label style={{ padding: "0.75rem 1.5rem", background: "#3b82f6", color: "#ffffff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            📤 SUBIR ARCHIVO
            <input type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; await onUploadMedia(file); e.target.value = ""; }} />
          </label>
        </div>

        {showVideoSelector && (
          <div style={{ marginTop: "1rem", padding: "1rem", background: "var(--card-bg)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <h4 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>Archivos Disponibles en /public/images/</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", maxHeight: "400px", overflowY: "auto" }}>
              {availableImages.map((video) => (
                <div
                  key={video.url}
                  role="button"
                  tabIndex={0}
                  onClick={() => { setConfig((c) => ({ ...c, instagramVideoUrl: video.url })); setShowVideoSelector(false); }}
                  onKeyDown={(e) => { if (e.key === "Enter") { setConfig((c) => ({ ...c, instagramVideoUrl: video.url })); setShowVideoSelector(false); } }}
                  style={{ cursor: "pointer", padding: "0.5rem", background: config.instagramVideoUrl === video.url ? "#2a8c4a" : "#fff", borderRadius: "8px", border: config.instagramVideoUrl === video.url ? "2px solid #2a8c4a" : "2px solid #d4d4c4", transition: "all 0.2s" }}
                  onMouseEnter={(e) => { if (config.instagramVideoUrl !== video.url) { e.currentTarget.style.borderColor = "#2a8c4a"; e.currentTarget.style.transform = "scale(1.05)"; } }}
                  onMouseLeave={(e) => { if (config.instagramVideoUrl !== video.url) { e.currentTarget.style.borderColor = "#d4d4c4"; e.currentTarget.style.transform = "scale(1)"; } }}
                >
                  {video.type === "video" ? (
                    <video src={video.url} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px" }} muted loop playsInline />
                  ) : (
                    <img src={video.url} alt={video.name} style={{ width: "100%", height: "120px", objectFit: "cover", borderRadius: "4px" }} />
                  )}
                  <div style={{ fontSize: "0.75rem", color: "var(--text-primary)", marginTop: "0.25rem", textAlign: "center", wordBreak: "break-all" }}>{video.name}</div>
                  {config.instagramVideoUrl === video.url && <div style={{ fontSize: "0.75rem", color: "#ffffff", textAlign: "center", marginTop: "0.25rem", fontWeight: 600 }}>✓ Seleccionado</div>}
                </div>
              ))}
              {availableImages.length === 0 && (
                <div style={{ gridColumn: "1/-1", textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>No hay archivos disponibles en /public/images/</div>
              )}
            </div>
          </div>
        )}
      </div>
    </SectionCard>
  );
}
