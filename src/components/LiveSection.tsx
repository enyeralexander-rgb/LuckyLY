"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../lib/clientAuth";

type SocialMedia = {
  instagram: string | null;
};

type HomePageConfig = {
  instagramVideoUrl: string | null;
};

export function LiveSection() {
  const [instagramUrl, setInstagramUrl] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuth(getStoredAuth());
    
    // Cargar URL de Instagram desde la API pública
    fetch("/api/public/social")
      .then((r) => {
        if (!r.ok) {
          return null;
        }
        return r.json();
      })
      .then((data: SocialMedia | null) => {
        if (data && data.instagram) {
          setInstagramUrl(data.instagram);
        }
      })
      .catch((err) => {
        console.error("Error al cargar redes sociales:", err);
      });

    // Primero verificar si hay configuración de preview
    const previewConfigStr = sessionStorage.getItem("previewConfig");
    if (previewConfigStr) {
      try {
        const previewConfig = JSON.parse(previewConfigStr);
        if (previewConfig?.instagramVideoUrl) {
          setVideoUrl(previewConfig.instagramVideoUrl);
          return;
        }
      } catch (err) {
        console.error("Error parsing preview config:", err);
      }
    }
    
    // Si no hay preview config, cargar desde API
    fetch("/api/public/homepage")
      .then((r) => {
        if (!r.ok) {
          console.error("Error al cargar homepage config:", r.status);
          return null;
        }
        return r.json();
      })
      .then((data: HomePageConfig | null) => {
        console.log("LiveSection - Config recibida:", data);
        if (data && data.instagramVideoUrl) {
          console.log("LiveSection - Usando video URL:", data.instagramVideoUrl);
          setVideoUrl(data.instagramVideoUrl);
        } else {
          console.log("LiveSection - Usando video por defecto");
          // Video por defecto
          setVideoUrl("/images/RULETA FONDO REDES.mp4");
        }
      })
      .catch((err) => {
        console.error("Error al cargar configuración:", err);
        // Video por defecto en caso de error
        setVideoUrl("/images/RULETA FONDO REDES.mp4");
      });
  }, []);

  const handleVideoClick = () => {
    if (instagramUrl) {
      window.open(instagramUrl, "_blank");
    }
  };

  return (
    <section className="container" style={{ display: "grid", gap: "1.5rem", padding: "2rem 0" }}>
      <div className="card" style={{ display: "grid", gap: "1.5rem", padding: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: "2rem" }}>MOMENTO DE LA SUERTE</h2>
          <Link 
            href="/live" 
            style={{ 
              color: "#85BB65", 
              textDecoration: "none", 
              fontWeight: 600,
              padding: ".5rem 1rem",
              borderRadius: "8px",
              border: "1px solid #85BB65"
            }}
          >
            Ir a la sala →
          </Link>
        </div>
        <div style={{ position: "relative", paddingBottom: "56.25%", background: "#228D57", borderRadius: "12px", overflow: "hidden", border: "2px solid #1a6b42", boxShadow: "0 10px 30px rgba(0,0,0,0.3)" }}>
          {videoUrl ? (
            // Verificar si es una URL de video o una imagen
            videoUrl.match(/\.(mp4|webm|ogg)$/i) ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                onClick={instagramUrl ? handleVideoClick : undefined}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  cursor: instagramUrl ? "pointer" : "default"
                }}
              />
            ) : videoUrl.startsWith("http") ? (
              // Es un enlace externo (Instagram, etc.)
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #228D57 0%, #1a6b42 100%)" }}>
                <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
                <p style={{ color: "#ffffff", fontSize: "1.25rem", fontWeight: 600, marginBottom: "1rem" }}>Síguenos en Instagram</p>
                <a 
                  href={videoUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#ffffff",
                    color: "#228D57",
                    borderRadius: "8px",
                    textDecoration: "none",
                    fontWeight: 700
                  }}
                >
                  Ver en Instagram →
                </a>
              </div>
            ) : (
              // Es una imagen local
              <img
                src={videoUrl}
                alt="Momento de la Suerte"
                onClick={instagramUrl ? handleVideoClick : undefined}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  cursor: instagramUrl ? "pointer" : "default"
                }}
              />
            )
          ) : (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", color: "#ffffff", fontSize: "1.125rem" }}>
              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🎰</div>
                <div>Configura el video desde el Dashboard para activar esta sección</div>
              </div>
            </div>
          )}
        </div>
        <p style={{ margin: 0, color: "#3E3E3C", fontSize: ".875rem", textAlign: "center" }}>
          {instagramUrl 
            ? "Visita nuestro Instagram y mira los resultados en vivo."
            : "El momento de la suerte te espera. Participa y gana increíbles premios en nuestros sorteos en vivo"}
        </p>
        {mounted && !auth && (
          <Link
            href="/auth/login"
            style={{ 
              padding: ".75rem 1.5rem", 
              background: "#85BB65", 
              color: "#ffffff", 
              border: "none", 
              borderRadius: "8px", 
              fontWeight: 700, 
              width: "fit-content",
              textDecoration: "none",
              display: "inline-block",
              margin: "0 auto",
              textTransform: "uppercase",
              fontFamily: "var(--font-cherry-bomb), cursive, system-ui, sans-serif"
            }}
          >
            JUEGA Y GANA ¡AHORA!
          </Link>
        )}
      </div>
    </section>
  );
}
