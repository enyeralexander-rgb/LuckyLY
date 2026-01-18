"use client";
import { Footer } from "../../components/Footer";
import { Hero } from "../../components/Hero";
import { LiveSection } from "../../components/LiveSection";
import { RaffleGrid } from "../../components/RaffleGrid";
import { ContactSection } from "../../components/ContactSection";
import { useEffect, useState, Suspense, createContext, useContext } from "react";
import { useSearchParams } from "next/navigation";

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  hero: Hero,
  raffles: RaffleGrid,
  live: LiveSection,
  contact: ContactSection,
  footer: Footer
};

// Contexto para compartir la configuración de preview
const PreviewConfigContext = createContext<any>(null);

function usePreviewConfig() {
  return useContext(PreviewConfigContext);
}

function PreviewContent() {
  const searchParams = useSearchParams();
  const [config, setConfig] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const configParam = searchParams.get("config");
    
    if (configParam) {
      try {
        const parsedConfig = JSON.parse(decodeURIComponent(configParam));
        setConfig(parsedConfig);
        // Guardar en sessionStorage para que los componentes puedan acceder
        sessionStorage.setItem("previewConfig", JSON.stringify(parsedConfig));
        setLoading(false);
      } catch (err) {
        console.error("Error parsing config:", err);
        // Fallback a configuración por defecto
          const defaultConfig = {
            heroImages: ["/images/ruleta-fortuna-hero.jpg"],
            heroTitle: "Participa en la ruleta en vivo",
            heroSubtitle: "Cinco categorías: Números, Animales, Estados, Banderas y Signos Zodiacales. Compra cupos, mira la ruleta y cobra tu premio.",
            heroEffect: "fade",
            heroEffectParams: {},
            heroAutoSlide: false,
            heroAutoSlideMode: "linear",
            heroAutoSlideInterval: 5000,
            heroScrollFade: true,
            heroOpacity: 0.8,
            heroBlur: 4.0,
            heroTextColor: null,
            heroSubtitleColor: null,
            heroOverlayColor: null,
            heroOverlayOpacity: 0.7,
            instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
            headerConfig: null,
            contactConfig: null,
            footerConfig: null,
            sectionOrder: ["hero", "raffles", "live", "footer"], // Sin "header" - el Header siempre se muestra
            sectionVisibility: {
              hero: true,
              raffles: true,
              live: true,
              footer: true
            }
          };
        setConfig(defaultConfig);
        sessionStorage.setItem("previewConfig", JSON.stringify(defaultConfig));
        setLoading(false);
      }
    } else {
      // Si no hay configuración en URL, intentar cargar de la API pública
      fetch("/api/public/homepage")
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch");
          return r.json();
        })
        .then((data) => {
          if (!data.error) {
            setConfig(data);
            sessionStorage.setItem("previewConfig", JSON.stringify(data));
          } else {
            throw new Error("Error in response");
          }
        })
        .catch((err) => {
          console.error("Error loading config:", err);
          const defaultConfig = {
            heroImages: ["/images/ruleta-fortuna-hero.jpg"],
            heroTitle: "Participa en la ruleta en vivo",
            heroSubtitle: "Cinco categorías: Números, Animales, Estados, Banderas y Signos Zodiacales. Compra cupos, mira la ruleta y cobra tu premio.",
            heroEffect: "fade",
            heroEffectParams: {},
            heroAutoSlide: false,
            heroAutoSlideMode: "linear",
            heroAutoSlideInterval: 5000,
            heroScrollFade: true,
            heroOpacity: 0.8,
            heroBlur: 4.0,
            heroTextColor: null,
            heroSubtitleColor: null,
            heroOverlayColor: null,
            heroOverlayOpacity: 0.7,
            instagramVideoUrl: "/images/RULETA FONDO REDES.mp4",
            headerConfig: null,
            contactConfig: null,
            footerConfig: null,
            sectionOrder: ["hero", "raffles", "live", "footer"], // Sin "header" - el Header siempre se muestra
            sectionVisibility: {
              hero: true,
              raffles: true,
              live: true,
              footer: true
            }
          };
          setConfig(defaultConfig);
          sessionStorage.setItem("previewConfig", JSON.stringify(defaultConfig));
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [searchParams]);

  if (!mounted || loading || !config) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>Cargando vista previa...</div>
        </div>
      </div>
    );
  }

  const sections = Array.isArray(config.sectionOrder) 
    ? config.sectionOrder.filter((section: string) => section !== "header" && config.sectionVisibility?.[section] !== false)
    : ["hero", "raffles", "live", "footer"];

  return (
    <PreviewConfigContext.Provider value={config}>
      {sections.map((section: string) => {
        const Component = SECTION_COMPONENTS[section];
        if (!Component) return null;
        return <Component key={section} />;
      })}
    </PreviewConfigContext.Provider>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={
      <div style={{ padding: "2rem", textAlign: "center", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div>
          <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
          <div>Cargando...</div>
        </div>
      </div>
    }>
      <PreviewContent />
    </Suspense>
  );
}
