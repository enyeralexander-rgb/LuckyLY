"use client";
import { useEffect, useState } from "react";

export function AboutSection() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.aboutConfig) {
          setConfig(previewConfig.aboutConfig);
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
        if (data.aboutConfig) {
          setConfig(data.aboutConfig);
        }
      })
      .catch((err) => console.error("Error cargando about config:", err));
  }, []);

  if (!config) return null;

  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <div className="card" style={{ padding: "2rem" }}>
        <h2 style={{ margin: "0 0 1rem", color: "#3E3E3C", fontSize: "2rem", textAlign: "center" }}>
          {config.title || "Quiénes Somos"}
        </h2>
        {config.content && (
          <div style={{ color: "#3E3E3C", fontSize: "1.125rem", lineHeight: "1.8", maxWidth: "800px", margin: "0 auto" }}>
            {config.content.split("\n").map((paragraph: string, index: number) => (
              <p key={index} style={{ margin: "0 0 1rem" }}>
                {paragraph}
              </p>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
