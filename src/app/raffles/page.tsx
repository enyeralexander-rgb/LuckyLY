"use client";
import { NavBar } from "../../components/NavBar";
import { Footer } from "../../components/Footer";
import { useEffect, useState } from "react";
import Link from "next/link";

type Raffle = {
  id: string;
  title: string;
  type: string;
  pricePerSlot: number;
  slots: number;
  status: string;
  ticketItems: { value: string; status?: string }[];
  prizes: string[];
  winnersCount: number;
  startsAt: string | null;
  closesAt: string | null;
};

export default function AllRafflesPage() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    fetch("/api/raffles")
      .then((r) => r.json())
      .then((data) => {
        // Filtrar solo sorteos activos
        let activeRaffles = data.filter((r: Raffle) => r.status === "ACTIVE");
        
        // Ordenar por fecha de inicio (los más cercanos primero)
        activeRaffles.sort((a: Raffle, b: Raffle) => {
          const dateA = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
          const dateB = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
          return dateA - dateB;
        });
        
        setRaffles(activeRaffles);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      NUMBERS: "NÚMEROS",
      ANIMALS: "ANIMALES",
      STATES: "ESTADOS",
      FLAGS: "BANDERAS",
      ZODIAC: "SIGNOS ZODIACALES"
    };
    return labels[type] || type.toUpperCase();
  }

  function getAvailableSlots(raffle: Raffle): number {
    // Contar solo cupos confirmados
    const confirmedSlots = raffle.ticketItems.filter((t: any) => t.status === "CONFIRMED").length;
    return raffle.slots - confirmedSlots;
  }

  function formatPrizesList(prizes: string[]): string {
    if (!prizes || prizes.length === 0) return "";
    
    return prizes.map((prize, index) => {
      // Extraer número del premio (puede venir como "Bs. 1000.00", "1000 Bs", etc.)
      const match = prize.match(/(\d+(?:\.\d+)?)\s*Bs?/i);
      let amount = 0;
      if (match) {
        amount = parseFloat(match[1]);
      } else {
        const numberMatch = prize.match(/(\d+(?:\.\d+)?)/);
        if (numberMatch) {
          amount = parseFloat(numberMatch[1]);
        }
      }
      
      const ordinal = index === 0 ? "1°" : index === 1 ? "2°" : "3°";
      return `${ordinal} Ganador: Bs. ${amount.toFixed(2)}`;
    }).join("\n");
  }

  function formatPrize(prize: string): string {
    // Extraer número del premio (puede venir como "1000 Bs", "1500 Bs", "1000.50 Bs", etc.)
    const match = prize.match(/(\d+(?:\.\d+)?)\s*Bs?/i);
    if (match) {
      const amount = parseFloat(match[1]);
      return `Bs. ${amount.toFixed(2)}`;
    }
    // Si no tiene formato de "X Bs", intentar extraer número y formatear
    const numberMatch = prize.match(/(\d+(?:\.\d+)?)/);
    if (numberMatch) {
      const amount = parseFloat(numberMatch[1]);
      return `Bs. ${amount.toFixed(2)}`;
    }
    // Si no se puede parsear, retornar como está pero con "Bs." al inicio
    return prize.includes("Bs") ? prize : `Bs. ${prize}`;
  }

  // Filtrar sorteos por tipo
  const filteredRaffles = filter === "ALL" 
    ? raffles 
    : raffles.filter((r) => r.type === filter);

  const filterTypes = [
    { value: "ALL", label: "TODOS" },
    { value: "NUMBERS", label: "NÚMEROS" },
    { value: "ANIMALS", label: "ANIMALES" },
    { value: "STATES", label: "ESTADOS" },
    { value: "FLAGS", label: "BANDERAS" },
    { value: "ZODIAC", label: "SIGNOS ZODIACALES" }
  ];

  return (
    <>
      <NavBar />
      <main className="container" style={{ paddingTop: "2rem", paddingBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0 }}>Todos los Sorteos Activos</h1>
          <Link href="/" style={{ color: "#85BB65", textDecoration: "none" }}>← Volver al inicio</Link>
        </div>

        {/* Filtros */}
        <div style={{ marginBottom: "2rem", display: "flex", gap: ".75rem", flexWrap: "wrap" }}>
          {filterTypes.map((ft) => (
            <button
              key={ft.value}
              onClick={() => setFilter(ft.value)}
              style={{
                padding: ".75rem 1.5rem",
                background: filter === ft.value ? "#85BB65" : "#228D57",
                color: filter === ft.value ? "#ffffff" : "#ffffff",
                border: filter === ft.value ? "2px solid #85BB65" : "1px solid #1f2937",
                borderRadius: "8px",
                fontWeight: filter === ft.value ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              {ft.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#3E3E3C" }}>
            Cargando sorteos...
          </div>
        ) : filteredRaffles.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            {filter === "ALL" 
              ? "No hay sorteos activos en este momento" 
              : `No hay sorteos activos de tipo "${getTypeLabel(filter)}"`}
          </div>
        ) : (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem"
          }}>
            {filteredRaffles.map((raffle) => {
              const availableSlots = getAvailableSlots(raffle);
              const isAvailable = availableSlots > 0;
              
              return (
                <article key={raffle.id} className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
                  <div style={{ display: "grid", gap: ".5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                      <span style={{ padding: ".25rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".75rem", color: "#ffffff", fontWeight: 600 }}>
                        {getTypeLabel(raffle.type)}
                      </span>
                      <span style={{ padding: ".25rem .75rem", background: isAvailable ? "#85BB65" : "#6b7280", borderRadius: "6px", fontSize: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>
                        {isAvailable ? "Disponible" : "Agotado"}
                      </span>
                    </div>
                    <h3 style={{ margin: 0, fontSize: "1.125rem" }}>{raffle.title}</h3>
                    {raffle.startsAt && (
                      <div style={{ fontSize: ".875rem", color: "#3E3E3C", marginTop: ".5rem" }}>
                        {(() => {
                          const date = new Date(raffle.startsAt);
                          const day = String(date.getDate()).padStart(2, "0");
                          const month = String(date.getMonth() + 1).padStart(2, "0");
                          const year = date.getFullYear();
                          const hours = date.getHours();
                          const minutes = String(date.getMinutes()).padStart(2, "0");
                          const period = hours >= 12 ? "P.M." : "A.M.";
                          const displayHours = hours % 12 || 12;
                          return `FECHA: ${day}/${month}/${year} ${String(displayHours).padStart(2, "0")}:${minutes} ${period}`;
                        })()}
                      </div>
                    )}
                  </div>
                  
                  <div style={{ display: "grid", gap: ".75rem", padding: "1rem", background: "#f5f5e6", borderRadius: "8px", border: "1px solid #d4d4c4" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Precio por cupo</span>
                      <strong style={{ fontSize: "1rem", color: "#228D57" }}>Bs. {Number(raffle.pricePerSlot).toFixed(2)}</strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Cupos disponibles</span>
                      <strong style={{ color: isAvailable ? "#85BB65" : "#ef4444", fontSize: ".875rem" }}>
                        {availableSlots}/{raffle.slots}
                      </strong>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Ganadores</span>
                      <strong style={{ fontSize: ".875rem", color: "#3E3E3C" }}>{raffle.winnersCount}</strong>
                    </div>
                    {raffle.prizes && Array.isArray(raffle.prizes) && raffle.prizes.length > 0 && (
                      <div style={{ marginTop: ".5rem", paddingTop: ".75rem", borderTop: "1px solid #d4d4c4" }}>
                        <span style={{ color: "#3E3E3C", fontSize: ".75rem", opacity: 0.8 }}>Premios:</span>
                        <div style={{ marginTop: ".25rem", color: "#228D57", fontWeight: 700, fontSize: "1.125rem", fontFamily: "var(--font-oswald), sans-serif", whiteSpace: "pre-line" }}>
                          {formatPrizesList(raffle.prizes)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <Link
                    href={`/raffles/${raffle.id}`}
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      background: isAvailable ? "#85BB65" : "#6b7280",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      textAlign: "center",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: isAvailable ? "pointer" : "not-allowed",
                      opacity: isAvailable ? 1 : 0.6,
                      fontSize: ".875rem",
                      textTransform: "uppercase"
                    }}
                  >
                    {isAvailable ? "VER Y COMPRAR" : "AGOTADO"}
                  </Link>
                </article>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

