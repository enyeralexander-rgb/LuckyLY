"use client";

import type { HomePageConfig } from "../types";
import { HeroLivePreview } from "./HeroLivePreview";

type PreviewSectionProps = {
  config: HomePageConfig;
  showPreview: boolean;
  setShowPreview: (show: boolean) => void;
  previewDevice: "mobile" | "tablet" | "desktop";
  setPreviewDevice: (device: "mobile" | "tablet" | "desktop") => void;
  onOpenInNewTab: () => void;
  onSave: () => void;
  saving: boolean;
  isDirty?: boolean;
};

const previewConfigForUrl = (config: HomePageConfig) => ({
  ...config,
  sectionOrder: null,
  sectionVisibility: null,
});

export function PreviewSection({
  config,
  showPreview,
  setShowPreview,
  previewDevice,
  setPreviewDevice,
  onOpenInNewTab,
  onSave,
  saving,
  isDirty = false,
}: PreviewSectionProps) {
  const previewConfig = previewConfigForUrl(config);
  const previewUrl = `/preview?config=${encodeURIComponent(JSON.stringify(previewConfig))}`;

  return (
    <>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => setShowPreview(!showPreview)}
          style={{
            padding: "0.75rem 1.5rem",
            background: showPreview ? "#ef4444" : "#3b82f6",
            color: "#fff",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "1rem",
            cursor: "pointer",
          }}
        >
          {showPreview ? "✖ Cerrar Vista Previa" : "👁️ Vista Previa"}
        </button>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={onOpenInNewTab}
            style={{
              padding: "0.75rem 1.5rem",
              background: "#8b5cf6",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: "pointer",
            }}
          >
            🔗 Abrir en Nueva Pestaña
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={saving}
            style={{
              padding: "0.75rem 2rem",
              background: saving ? "#6b7280" : "#2a8c4a",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "Guardando..." : isDirty ? "💾 Guardar cambios" : "💾 Guardar Configuración"}
          </button>
        </div>
      </div>

      {showPreview && (
        <div
          className="card"
          style={{ padding: "2rem", marginTop: "1.5rem", position: "relative" }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
            }}
          >
            <h2 style={{ margin: 0, color: "var(--text-primary)" }}>👁️ Vista Previa</h2>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              {(["mobile", "tablet", "desktop"] as const).map((device) => (
                <button
                  key={device}
                  type="button"
                  onClick={() => setPreviewDevice(device)}
                  style={{
                    padding: "0.5rem 1rem",
                    background: previewDevice === device ? "#2a8c4a" : "#d0fdd7",
                    color: previewDevice === device ? "#fff" : "#1a5c2e",
                    border: "none",
                    borderRadius: "4px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {device === "mobile" && "📱 Móvil"}
                  {device === "tablet" && "📱 Tablet"}
                  {device === "desktop" && "💻 Desktop"}
                </button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: "1.5rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "var(--text-secondary)" }}>
              Preview en vivo del Hero
            </h3>
            <HeroLivePreview config={config} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "1rem", color: "var(--text-secondary)" }}>
              Vista Previa completa (iframe)
            </h3>
          </div>
          <div
            style={{
              border: "2px solid #d4d4c4",
              borderRadius: "8px",
              overflow: "hidden",
              background: "#f9fafb",
              display: "flex",
              justifyContent: "center",
              padding: "1rem",
            }}
          >
            <div
              style={{
                width:
                  previewDevice === "mobile" ? "375px" : previewDevice === "tablet" ? "768px" : "100%",
                maxWidth: "100%",
                background: "var(--card-bg)",
                border: "8px solid #1f2937",
                borderRadius: "8px",
                overflow: "hidden",
                transform:
                  previewDevice === "mobile"
                    ? "scale(0.8)"
                    : previewDevice === "tablet"
                      ? "scale(0.9)"
                      : "scale(1)",
                transformOrigin: "top center",
                transition: "all 0.3s",
              }}
            >
              <iframe
                src={previewUrl}
                style={{
                  width: "100%",
                  height:
                    previewDevice === "mobile" ? "667px" : previewDevice === "tablet" ? "1024px" : "800px",
                  border: "none",
                  pointerEvents: "auto",
                  overflow: "auto",
                }}
                title="Vista Previa"
                scrolling="yes"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
