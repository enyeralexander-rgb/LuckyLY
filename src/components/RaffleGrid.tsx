"use client";
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

export function RaffleGrid() {
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/raffles")
      .then((r) => {
        if (!r.ok) {
          throw new Error("Error al cargar sorteos");
        }
        return r.json();
      })
      .then((data) => {
        // Verificar que data es un array y no hay error
        if (data.error) {
          console.error("Error en la respuesta:", data.error);
          setRaffles([]);
          setLoading(false);
          return;
        }
        
        if (!Array.isArray(data)) {
          console.error("Error: los datos no son un array", data);
          setRaffles([]);
          setLoading(false);
          return;
        }
        
        // Filtrar solo sorteos activos
        let activeRaffles = data.filter((r: any) => r && typeof r === "object" && r.status === "ACTIVE");
        
        // Ordenar por fecha de inicio (los más cercanos primero)
        activeRaffles.sort((a: Raffle, b: Raffle) => {
          const dateA = a.startsAt ? new Date(a.startsAt).getTime() : Infinity;
          const dateB = b.startsAt ? new Date(b.startsAt).getTime() : Infinity;
          return dateA - dateB;
        });
        
        setRaffles(activeRaffles);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar sorteos:", err);
        setRaffles([]);
        setLoading(false);
      });
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
    // Contar solo cupos confirmados (excluir pendientes y rechazados)
    if (!raffle.ticketItems || !Array.isArray(raffle.ticketItems)) {
      return raffle.slots;
    }
    const confirmedSlots = raffle.ticketItems.filter((t: any) => t && (t.status === "CONFIRMED" || (!t.status && t.value))).length;
    return Math.max(0, raffle.slots - confirmedSlots);
  }

  function formatPrizesList(prizes: string[]): string {
    if (!prizes || prizes.length === 0) return "";
    
    return prizes.map((prize, index) => {
      if (!prize || typeof prize !== "string") return "";
      
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
      
      // Validar que amount sea un número válido
      if (isNaN(amount) || amount <= 0) {
        return "";
      }
      
      const ordinal = index === 0 ? "1°" : index === 1 ? "2°" : "3°";
      return `${ordinal} Ganador: Bs. ${amount.toFixed(2)}`;
    }).filter(line => line !== "").join("\n");
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

  if (loading) {
    return (
      <section className="container" style={{ display: "grid", gap: "1rem", padding: "2rem 0" }}>
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#3E3E3C" }}>
          Cargando sorteos...
        </div>
      </section>
    );
  }

  if (raffles.length === 0) {
    return (
      <section className="container" style={{ display: "grid", gap: "1rem", padding: "2rem 0" }}>
        <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#3E3E3C" }}>
          No hay sorteos activos en este momento
        </div>
      </section>
    );
  }

  // Mostrar solo los primeros 3 sorteos
  const displayedRaffles = raffles.slice(0, 3);

  return (
    <section className="container" style={{ display: "grid", gap: "1.5rem", padding: "2rem 0" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1rem" }}>
        <Link 
          href="/raffles" 
          style={{ 
            padding: ".75rem 2rem", 
            background: "#85BB65", 
            color: "#ffffff", 
            borderRadius: "10px", 
            fontWeight: 400, 
            fontSize: "1.125rem",
            textDecoration: "none",
            textAlign: "center",
            fontFamily: "var(--font-cherry-bomb), cursive, system-ui, sans-serif",
            textTransform: "uppercase"
          }}
        >
          VER TODOS LOS SORTEOS ACTIVOS
        </Link>
      </div>
      <div style={{ display: "grid", gap: "1.5rem", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        {displayedRaffles.map((raffle) => {
          const availableSlots = getAvailableSlots(raffle);
          const isAvailable = availableSlots > 0;
          
          return (
            <article key={raffle.id} className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
              <div style={{ display: "grid", gap: ".5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <span style={{ padding: ".25rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".75rem", color: "#ffffff", fontWeight: 600 }}>
                    {getTypeLabel(raffle.type)}
                  </span>
                  <span style={{ padding: ".25rem .75rem", background: isAvailable ? "#85BB65" : "#6b7280", borderRadius: "6px", fontSize: ".75rem", color: "#ffffff", fontWeight: 700 }}>
                    {isAvailable ? "Disponible" : "Agotado"}
                  </span>
                </div>
                <h3 style={{ margin: 0, fontSize: "1.25rem" }}>{raffle.title}</h3>
              </div>
              
              <div style={{ display: "grid", gap: ".75rem", padding: "1rem", background: "#f5f5e6", borderRadius: "8px", border: "1px solid #d4d4c4" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Precio por cupo</span>
                  <strong style={{ fontSize: "1.125rem", color: "#228D57", fontWeight: 700 }}>Bs. {Number(raffle.pricePerSlot).toFixed(2)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Cupos disponibles</span>
                  <strong style={{ color: isAvailable ? "#85BB65" : "#ef4444" }}>
                    {availableSlots}/{raffle.slots}
                  </strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Ganadores</span>
                  <strong style={{ color: "#3E3E3C" }}>{raffle.winnersCount}</strong>
                </div>
                {raffle.prizes && Array.isArray(raffle.prizes) && raffle.prizes.length > 0 && (
                  <div style={{ marginTop: ".5rem", paddingTop: ".75rem", borderTop: "1px solid #d4d4c4" }}>
                    <span style={{ color: "#3E3E3C", fontSize: ".875rem", opacity: 0.8 }}>Premios:</span>
                    <div style={{ marginTop: ".25rem", color: "#228D57", fontWeight: 700, fontSize: "1.3125rem", fontFamily: "var(--font-oswald), sans-serif", whiteSpace: "pre-line" }}>
                      {formatPrizesList(raffle.prizes)}
                    </div>
                  </div>
                )}
              </div>
              
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
                  textTransform: "uppercase"
                }}
              >
                {isAvailable ? "VER Y COMPRAR" : "AGOTADO"}
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}

