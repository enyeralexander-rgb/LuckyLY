"use client";
import Link from "next/link";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { getItemWithEmoji } from "../../../../lib/raffleEmojis";

type Raffle = {
  id: string;
  title: string;
  type: string;
  status: string;
  winningItem: string | null;
  pricePerSlot: number;
  prizes: any;
  closesAt: string | null;
};

type Ticket = {
  id: string;
  raffleId: string;
  items: string[];
  totalPaid: number;
  status: string;
  purchasedAt: string;
  raffle: Raffle;
  prizeClaim: { status: string } | null;
};

export default function HistorialPage() {
  const [auth, setAuth] = useState<any>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "finished" | "won">("all");

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadData();
    }
  }, [auth]);

  async function loadData() {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const ticketsRes = await fetch("/api/claims", { headers: { Authorization: `Bearer ${auth.token}` } });
      const ticketsData = await ticketsRes.json();
      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  }

  function downloadTicketPDF(ticketId: string) {
    window.open(`/api/tickets/${ticketId}/pdf`, "_blank");
  }

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

  // Filtrar tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = searchTerm === "" || 
      ticket.raffle.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticket.items.some(item => item.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === "all" ||
      (filterStatus === "active" && ticket.raffle.status === "ACTIVE") ||
      (filterStatus === "finished" && ticket.raffle.status === "FINISHED") ||
      (filterStatus === "won" && ticket.status === "WIN");

    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>HISTORIAL DE APUESTAS</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver a MI CUENTA</Link>
        </div>

        <div className="card" style={{ padding: "1.5rem" }}>
          <div style={{ display: "flex", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Buscar por sorteo o cupo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                flex: 1,
                minWidth: "200px",
                padding: ".75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: "1rem"
              }}
            />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              style={{
                padding: ".75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                fontSize: "1rem"
              }}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="finished">Finalizados</option>
              <option value="won">Ganadores</option>
            </select>
          </div>

          {filteredTickets.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No se encontraron tickets
            </div>
          ) : (
            <div style={{ display: "grid", gap: "1rem" }}>
              {filteredTickets.map((ticket) => {
                const ticketItems = Array.isArray(ticket.items) ? ticket.items : [];
                const winningItems = ticket.raffle.winningItem ? ticket.raffle.winningItem.split(", ").map((w: string) => w.trim()) : [];
                const isWinner = ticketItems.some((item: string) => winningItems.includes(item));

                return (
                  <div key={ticket.id} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                      <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{ticket.raffle.title}</h3>
                      {isWinner && (
                        <span style={{ padding: ".25rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".75rem", color: "var(--text-primary)", fontWeight: 700 }}>
                          🎉 GANADOR
                        </span>
                      )}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".75rem", fontSize: ".875rem", color: "var(--text-secondary)" }}>
                      <div><strong>Tipo:</strong> {getTypeLabel(ticket.raffle.type)}</div>
                      <div><strong>Cupos comprados:</strong> {ticketItems.length}</div>
                      <div><strong>Total pagado:</strong> {Number(ticket.totalPaid).toFixed(2)} Bs</div>
                      <div><strong>Fecha de compra:</strong> {new Date(ticket.purchasedAt).toLocaleDateString("es-ES")}</div>
                      {ticket.raffle.closesAt && (
                        <div><strong>Fecha del sorteo:</strong> {new Date(ticket.raffle.closesAt).toLocaleDateString("es-ES")}</div>
                      )}
                    </div>
                    <div style={{ marginTop: ".5rem" }}>
                      <strong style={{ color: "#85BB65" }}>Cupos: </strong>
                      <span style={{ color: "var(--text-primary)" }}>
                        {ticketItems.map(item => getItemWithEmoji(item, ticket.raffle.type)).join(", ")}
                      </span>
                    </div>
                    {ticket.raffle.prizes && Array.isArray(ticket.raffle.prizes) && ticket.raffle.prizes.length > 0 && (
                      <div style={{ marginTop: ".5rem", padding: ".75rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px" }}>
                        <strong>Premios a ganar: </strong>
                        <span style={{ color: "var(--text-primary)" }}>{ticket.raffle.prizes.join(", ")}</span>
                      </div>
                    )}
                    {ticket.raffle.winningItem && (
                      <div style={{ marginTop: ".5rem", padding: ".75rem", background: isWinner ? "rgba(133, 187, 101, 0.1)" : "rgba(107, 114, 128, 0.1)", borderRadius: "8px" }}>
                        <strong>Ganador del sorteo: </strong>
                        <span style={{ color: isWinner ? "#85BB65" : "#6b7280" }}>
                          {ticket.raffle.winningItem}
                        </span>
                      </div>
                    )}
                    <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", alignItems: "center" }}>
                      {ticket.status === "CONFIRMED" || ticket.status === "WIN" ? (
                        <button
                          onClick={() => downloadTicketPDF(ticket.id)}
                          style={{
                            padding: ".5rem 1rem",
                            background: "#85BB65",
                            color: "var(--text-primary)",
                            border: "none",
                            borderRadius: "6px",
                            fontWeight: 600,
                            cursor: "pointer",
                            fontSize: "0.875rem"
                          }}
                        >
                          📄 Descargar Ticket PDF
                        </button>
                      ) : (
                        <span style={{
                          padding: ".5rem 1rem",
                          background: "rgba(251, 191, 36, 0.2)",
                          color: "#d97706",
                          borderRadius: "6px",
                          fontWeight: 600,
                          fontSize: "0.875rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem"
                        }}>
                          ⏳ Pendiente de confirmación por administrador
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
