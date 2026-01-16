"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function Footer() {
  const [config, setConfig] = useState<any>(null);
  const [darkMode, setDarkMode] = useState(false);

  useEffect(() => {
    // Cargar tema desde localStorage
    const savedTheme = localStorage.getItem("theme");
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    
    setDarkMode(isDark);
    document.body.setAttribute("data-theme", isDark ? "dark" : "light");
    
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

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    
    // Guardar en localStorage
    localStorage.setItem("theme", newDarkMode ? "dark" : "light");
    
    // Actualizar atributo data-theme en body
    document.body.setAttribute("data-theme", newDarkMode ? "dark" : "light");
  };

  const copyright = config?.copyright || `© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.`;
  const showSocialLinks = config?.showSocialLinks !== false;

  return (
    <footer className="footer-theme">
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "1.5rem", paddingTop: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
        <span className="footer-text">{copyright}</span>
        <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
          <Link href="/terms" className="footer-link">Términos y Condiciones</Link>
          <Link href="/rules" className="footer-link">Reglas</Link>
          {showSocialLinks && (
            <Link href="/social" className="footer-link">Redes Sociales</Link>
          )}
          <button
            onClick={toggleDarkMode}
            className="theme-toggle-button"
            title={darkMode ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            aria-label="Toggle dark mode"
          >
            {darkMode ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </footer>
  );
}
