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
      <section className="container grid gap-4 py-8">
        <div className="card text-center p-8 text-brand-text">
          Cargando sorteos...
        </div>
      </section>
    );
  }

  if (raffles.length === 0) {
    return (
      <section className="container grid gap-4 py-8">
        <div className="card text-center p-8 text-brand-text">
          No hay sorteos activos en este momento
        </div>
      </section>
    );
  }

  // Mostrar solo los primeros 3 sorteos
  const displayedRaffles = raffles.slice(0, 3);

  return (
    <section className="container grid gap-6 py-8">
      <div className="flex flex-col items-center gap-4">
        <Link 
          href="/raffles" 
          className="px-8 py-3 rounded-xl font-normal text-lg text-center uppercase font-[family-name:var(--font-cherry-bomb)] transition-transform hover:scale-105 active:scale-95"
          style={{ 
            background: "var(--button-secondary)", 
            color: "var(--button-text)",
            boxShadow: "0 4px 14px rgba(0,0,0,0.1)"
          }}
        >
          VER TODOS LOS SORTEOS ACTIVOS
        </Link>
      </div>
      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {displayedRaffles.map((raffle) => {
          const availableSlots = getAvailableSlots(raffle);
          const isAvailable = availableSlots > 0;
          
          return (
            <article key={raffle.id} className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.5rem" }}>
                    {raffle.type === "NUMBERS" ? "🔢" : 
                     raffle.type === "ANIMALS" ? "🐾" : 
                     raffle.type === "STATES" ? "🗺️" : 
                     raffle.type === "FLAGS" ? "🏴" : "🎰"}
                  </span>
                  <span style={{ fontWeight: 700, color: "var(--text-secondary)" }}>{getTypeLabel(raffle.type)}</span>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${isAvailable ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {isAvailable ? "DISPONIBLE" : "AGOTADO"}
                </span>
              </div>
              
              <div>
                <h3 style={{ margin: 0, fontSize: "1.25rem", color: "var(--text-primary)" }}>{raffle.title}</h3>
              </div>

              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Precio:</span>
                  <strong style={{ color: "var(--text-primary)", fontSize: "1.125rem" }}>Bs. {Number(raffle.pricePerSlot).toFixed(2)}</strong>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span style={{ color: "var(--text-secondary)" }}>Disponibles:</span>
                  <strong className={isAvailable ? "text-green-600" : "text-red-500"}>
                    {availableSlots}/{raffle.slots}
                  </strong>
                </div>
              </div>

              {raffle.startsAt && (
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: "auto" }}>
                  <span>📅</span>
                  <span>
                    {(() => {
                      const date = new Date(raffle.startsAt);
                      const day = String(date.getDate()).padStart(2, "0");
                      const month = String(date.getMonth() + 1).padStart(2, "0");
                      const year = date.getFullYear();
                      return `${day}/${month}/${year}`;
                    })()}
                  </span>
                  <span style={{ background: "var(--bg-primary)", padding: "0.25rem 0.5rem", borderRadius: "6px", marginLeft: "auto" }}>
                    {(() => {
                      const date = new Date(raffle.startsAt);
                      const hours = date.getHours();
                      const minutes = String(date.getMinutes()).padStart(2, "0");
                      const period = hours >= 12 ? "PM" : "AM";
                      return `${hours % 12 || 12}:${minutes} ${period}`;
                    })()}
                  </span>
                </div>
              )}
              
              <div>
                <Link
                  href={`/raffles/${raffle.id}`}
                  className={`w-full p-3 border-0 rounded-lg font-bold text-center no-underline flex items-center justify-center uppercase ${isAvailable ? "cursor-pointer" : "cursor-not-allowed"}`}
                  style={{ 
                    background: isAvailable ? "var(--button-primary)" : "var(--bg-hover)",
                    color: isAvailable ? "var(--button-text)" : "var(--text-muted)",
                    transition: "all 0.2s"
                  }}
                >
                  {isAvailable ? "JUGAR AHORA" : "AGOTADO"}
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

