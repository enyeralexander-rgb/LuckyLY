"use client";
import { useEffect, useState } from "react";

export function TestimonialsSection() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.testimonialsConfig) {
          setConfig(previewConfig.testimonialsConfig);
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
        if (data.testimonialsConfig) {
          setConfig(data.testimonialsConfig);
        }
      })
      .catch((err) => console.error("Error cargando testimonials config:", err));
  }, []);

  if (!config) return null;

  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ margin: "0 0 2rem", color: "#3E3E3C", fontSize: "2rem", textAlign: "center" }}>
          {config.title || "Testimonios"}
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "1.5rem" }}>
          {/* Testimonios aquí */}
        </div>
      </div>
    </section>
  );
}
