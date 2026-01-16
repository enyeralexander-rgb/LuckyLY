"use client";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { LiveSection } from "../components/LiveSection";
import { RaffleGrid } from "../components/RaffleGrid";
import { AuthSection } from "../components/AuthSection";
import { ContactSection } from "../components/ContactSection";
import { useEffect, useState } from "react";

type HomePageConfig = {
  sectionOrder: string[];
  sectionVisibility: Record<string, boolean>;
};

const SECTION_COMPONENTS: Record<string, React.ComponentType<any>> = {
  hero: Hero,
  raffles: RaffleGrid,
  live: LiveSection,
  contact: ContactSection,
  footer: Footer,
};

export default function HomePage() {
  const [config, setConfig] = useState<HomePageConfig>({
    sectionOrder: ["hero", "raffles", "live", "footer"],
    sectionVisibility: {
      hero: true,
      raffles: true,
      live: true,
      contact: false,
      footer: true
    }
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Cargar configuración de orden y visibilidad de secciones
    fetch("/api/public/homepage")
      .then((r) => {
        if (!r.ok) return null;
        return r.json();
      })
      .then((data) => {
        if (data) {
          setConfig({
            sectionOrder: Array.isArray(data.sectionOrder) ? data.sectionOrder.filter((s: string) => s !== "header") : ["hero", "raffles", "live", "footer"],
            sectionVisibility: data.sectionVisibility || {
              hero: true,
              raffles: true,
              live: true,
              contact: false,
              footer: true
            }
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar configuración:", err);
      });
  }, []);

  const sections = mounted 
    ? (Array.isArray(config.sectionOrder) ? config.sectionOrder : ["hero", "raffles", "live", "footer"])
        .filter(section => section !== "header" && config.sectionVisibility[section] !== false)
    : ["hero", "raffles", "live", "footer"];

  return (
    <>
      {sections.map((section) => {
        const Component = SECTION_COMPONENTS[section];
        if (!Component) return null;
        return <Component key={section} />;
      })}
    </>
  );
}
