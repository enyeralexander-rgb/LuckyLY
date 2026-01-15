"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Footer() {
  const [config, setConfig] = useState<any>(null);

  useEffect(() => {
    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.footerConfig) {
          setConfig(previewConfig.footerConfig);
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
        if (data.footerConfig) {
          setConfig(data.footerConfig);
        }
      })
      .catch((err) => console.error("Error cargando footer config:", err));
  }, []);

  const copyright = config?.copyright || `© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.`;
  const showSocialLinks = config?.showSocialLinks !== false;

  return (
    <footer style={{ marginTop: "3rem", borderTop: "1px solid #d0fdd7", background: "#d0fdd7" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1.5rem", paddingTop: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <span style={{ color: "#1a5c2e" }}>{copyright}</span>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
          <Link href="/terms" style={{ color: "#2a8c4a", textDecoration: "none" }}>Términos y Condiciones</Link>
          <Link href="/rules" style={{ color: "#2a8c4a", textDecoration: "none" }}>Reglas</Link>
          {showSocialLinks && (
            <Link href="/social" style={{ color: "#2a8c4a", textDecoration: "none" }}>Redes Sociales</Link>
          )}
        </div>
      </div>
    </footer>
  );
}
