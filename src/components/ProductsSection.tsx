"use client";
import { useEffect, useState } from "react";

export function ProductsSection() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.productsConfig) {
          setConfig(previewConfig.productsConfig);
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
        if (data.productsConfig) {
          setConfig(data.productsConfig);
        }
      })
      .catch((err) => console.error("Error cargando products config:", err));
  }, []);

  if (!config) return null;

  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ margin: "0 0 1rem", color: "#3E3E3C", fontSize: "2rem", textAlign: "center" }}>
          {config.title || "Nuestros Productos"}
        </h2>
        {config.description && (
          <p style={{ margin: "0 0 2rem", color: "#3E3E3C", textAlign: "center", fontSize: "1.125rem" }}>
            {config.description}
          </p>
        )}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1.5rem" }}>
          {/* Productos aquí */}
        </div>
      </div>
    </section>
  );
}
