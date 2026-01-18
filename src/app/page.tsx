"use client";
import { Footer } from "../components/Footer";
import { Hero } from "../components/Hero";
import { LiveSection } from "../components/LiveSection";
import { RaffleGrid } from "../components/RaffleGrid";
import { ResultsSection } from "../components/ResultsSection";
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
  results: ResultsSection,
  live: LiveSection,
  contact: ContactSection,
  footer: Footer,
};

export default function HomePage() {
  const [config, setConfig] = useState<HomePageConfig>({
    sectionOrder: ["hero", "raffles", "results", "live", "footer"],
    sectionVisibility: {
      hero: true,
      raffles: true,
      results: true,
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
          // Asegurar que "results" esté en el orden si no viene del servidor
          let order = Array.isArray(data.sectionOrder) ? data.sectionOrder.filter((s: string) => s !== "header") : ["hero", "raffles", "results", "live", "footer"];
          // Si no incluye "results", insertarlo después de "raffles"
          if (!order.includes("results")) {
            const rafflesIndex = order.indexOf("raffles");
            if (rafflesIndex !== -1) {
              order.splice(rafflesIndex + 1, 0, "results");
            } else {
              order.push("results");
            }
          }
          
          setConfig({
            sectionOrder: order,
            sectionVisibility: {
              hero: true,
              raffles: true,
              results: true,
              live: true,
              contact: false,
              footer: true,
              ...data.sectionVisibility
            }
          });
        }
      })
      .catch((err) => {
        console.error("Error al cargar configuración:", err);
      });
  }, []);

  const sections = mounted 
    ? (Array.isArray(config.sectionOrder) ? config.sectionOrder : ["hero", "raffles", "results", "live", "footer"])
        .filter(section => section !== "header" && config.sectionVisibility[section] !== false)
    : ["hero", "raffles", "results", "live", "footer"];

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
