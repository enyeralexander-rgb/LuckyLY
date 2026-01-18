"use client";
import { useEffect, useState } from "react";

export function ContactSection() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.contactConfig) {
          setConfig(previewConfig.contactConfig);
          return;
        }
      } catch (err) {
        console.error("Error parsing preview config:", err);
      }
    }
    
    // Si no hay preview config, cargar desde API
    fetch("/api/public/homepage")
      .then((r) => r.json())
      .then((data) => {
        if (data.contactConfig) {
          setConfig(data.contactConfig);
        }
      })
      .catch((err) => console.error("Error cargando contact config:", err));
  }, []);

  if (!config) return null;

  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <div className="card" style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
        <h2 style={{ margin: "0 0 1.5rem", fontSize: "2rem", textAlign: "center" }}>
          {config.title || "Contacto"}
        </h2>
        <div style={{ display: "grid", gap: "1rem", textAlign: "center" }}>
          {config.email && (
            <div>
              <strong>Email:</strong>{" "}
              <a href={`mailto:${config.email}`}>
                {config.email}
              </a>
            </div>
          )}
          {config.phone && (
            <div>
              <strong>Teléfono:</strong>{" "}
              <a href={`tel:${config.phone}`}>
                {config.phone}
              </a>
            </div>
          )}
          {config.showForm && (
            <div style={{ marginTop: "1.5rem" }}>
              {/* Formulario de contacto aquí */}
              <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>
                El formulario de contacto se implementará próximamente.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
