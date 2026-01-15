"use client";
import { Footer } from "../../components/Footer";
import { NavBar } from "../../components/NavBar";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../lib/clientAuth";

type Raffle = {
  id: string;
  title: string;
  type: string;
  status: string;
  executedAt: string | null;
  winningItem: string | null;
};

type UserTicket = {
  raffleId: string;
  items: string[];
};

export default function ResultsPage() {
  const [auth, setAuth] = useState<any>(null);
  const [raffles, setRaffles] = useState<Raffle[]>([]);
  const [userTickets, setUserTickets] = useState<Record<string, UserTicket>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    // Cargar sorteos finalizados
    fetch("/api/raffles")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setRaffles([]);
          setLoading(false);
          return;
        }
        const finished = Array.isArray(data) 
          ? data.filter((r: Raffle) => r.status === "FINISHED" && r.executedAt) 
          : [];
        setRaffles(finished);
        setLoading(false);
      })
      .catch(() => {
        setRaffles([]);
        setLoading(false);
      });

    // Si hay usuario logueado, cargar sus tickets
    if (auth?.token) {
      fetch("/api/claims", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const ticketsMap: Record<string, UserTicket> = {};
            data.forEach((ticket: any) => {
              if (ticket.raffleId) {
                ticketsMap[ticket.raffleId] = {
                  raffleId: ticket.raffleId,
                  items: Array.isArray(ticket.items) ? ticket.items : []
                };
              }
            });
            setUserTickets(ticketsMap);
          }
        })
        .catch(() => {});
    }
  }, [auth]);

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

  function getUserStatus(raffle: Raffle): "win" | "lose" | "neutral" {
    if (!auth || !raffle.winningItem) return "neutral";
    
    const userTicket = userTickets[raffle.id];
    if (!userTicket) return "neutral";
    
    const winningItems = raffle.winningItem.split(", ").map(w => w.trim());
    const isWinner = userTicket.items.some(item => winningItems.includes(item));
    
    return isWinner ? "win" : "lose";
  }

  return (
    <>
      <NavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1 style={{ color: "#3E3E3C" }}>Resultados</h1>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#3E3E3C" }}>Cargando resultados...</div>
        ) : raffles.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#3E3E3C" }}>
            No hay resultados disponibles
          </div>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead style={{ textAlign: "left" }}>
                <tr style={{ borderBottom: "2px solid #d4d4c4" }}>
                  <th style={{ padding: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>Fecha</th>
                  <th style={{ padding: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>Hora</th>
                  <th style={{ padding: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>Tipo de Sorteo</th>
                  <th style={{ padding: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>Ítem Ganador</th>
                </tr>
              </thead>
              <tbody>
                {raffles.map((raffle) => {
                  const status = getUserStatus(raffle);
                  const executedDate = raffle.executedAt ? new Date(raffle.executedAt) : null;
                  
                  return (
                    <tr 
                      key={raffle.id} 
                      style={{ 
                        background: status === "win" ? "rgba(133, 187, 101, 0.15)" : status === "lose" ? "rgba(239, 68, 68, 0.15)" : "transparent",
                        borderLeft: status === "win" ? "4px solid #85BB65" : status === "lose" ? "4px solid #ef4444" : "4px solid transparent"
                      }}
                    >
                      <td style={{ padding: ".75rem", borderTop: "1px solid #d4d4c4", color: "#3E3E3C" }}>
                        {executedDate ? (() => {
                          const day = String(executedDate.getDate()).padStart(2, "0");
                          const month = String(executedDate.getMonth() + 1).padStart(2, "0");
                          const year = executedDate.getFullYear();
                          return `${day}/${month}/${year}`;
                        })() : "N/A"}
                      </td>
                      <td style={{ padding: ".75rem", borderTop: "1px solid #d4d4c4", color: "#3E3E3C" }}>
                        {executedDate ? (() => {
                          const hours = executedDate.getHours();
                          const minutes = String(executedDate.getMinutes()).padStart(2, "0");
                          const period = hours >= 12 ? "P.M." : "A.M.";
                          const displayHours = hours % 12 || 12;
                          return `${String(displayHours).padStart(2, "0")}:${minutes} ${period}`;
                        })() : "N/A"}
                      </td>
                      <td style={{ padding: ".75rem", borderTop: "1px solid #d4d4c4", color: "#3E3E3C" }}>
                        <span style={{ padding: ".25rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".875rem", fontWeight: 600, color: "#ffffff", display: "inline-block" }}>
                          {getTypeLabel(raffle.type)}
                        </span>
                      </td>
                      <td style={{ padding: ".75rem", borderTop: "1px solid #d4d4c4", fontWeight: status === "win" ? 700 : 400, color: status === "win" ? "#228D57" : status === "lose" ? "#ef4444" : "#3E3E3C" }}>
                        {raffle.winningItem || "N/A"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

