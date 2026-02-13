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
        
        let activeRaffles = data.filter((r: any) => r && typeof r === "object" && r.status === "ACTIVE");
        
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
      // Si no se pudo parsear un monto válido, mostrar el texto original
      if (amount <= 0 && prize.trim().length > 0) return `${ordinal} Ganador: ${prize}`;
      
      return `${ordinal} Ganador: Bs. ${amount.toFixed(2)}`;
    }).filter(line => line !== "").join("\n");
  }

  if (loading) {
    return (
      <section className="container grid gap-6 py-8">
        <div className="card text-center p-8" style={{ color: "var(--text-secondary)" }}>
          Cargando sorteos...
        </div>
      </section>
    );
  }

  if (raffles.length === 0) {
    return (
      <section className="container grid gap-6 py-8">
        <div className="card text-center p-8" style={{ color: "var(--text-secondary)" }}>
          No hay sorteos activos en este momento
        </div>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Link
            href="/raffles"
            style={{
              padding: ".75rem 1.5rem",
              background: "var(--button-primary)",
              color: "var(--button-text)",
              borderRadius: "8px",
              fontWeight: 700,
              textDecoration: "none",
              fontSize: ".875rem"
            }}
          >
            VER SORTEOS
          </Link>
        </div>
      </section>
    );
  }

  const displayedRaffles = raffles.slice(0, 6);

  return (
    <section className="container grid gap-6 py-8">
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "1.5rem", marginBottom: "1rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.75rem", fontWeight: 700, color: "var(--text-primary)" }}>
          Sorteos activos
        </h2>
        <Link
          href="/raffles"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            maxWidth: "320px",
            padding: "0.75rem 1.5rem",
            background: "var(--button-primary)",
            color: "var(--button-text)",
            border: "none",
            borderRadius: "8px",
            fontWeight: 700,
            fontSize: "0.875rem",
            textTransform: "uppercase",
            textDecoration: "none",
            boxShadow: "0 4px 12px var(--card-shadow)",
            transition: "background-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease"
          }}
          className="raffle-grid-cta"
        >
          VER TODOS LOS SORTEOS ACTIVOS
        </Link>
      </div>
      <div
        className="raffle-grid-cards"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
          gap: "1.5rem"
        }}
      >
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
    </section>
  );
}

