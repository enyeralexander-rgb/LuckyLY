"use client";
import Link from "next/link";
import { NavBar } from "../../../components/NavBar";
import { AuthGuard } from "../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../lib/clientAuth";
import { getItemWithEmoji } from "../../../lib/raffleEmojis";
import { useRouter } from "next/navigation";

type Raffle = {
  id: string;
  title: string;
  type: string;
  status: string;
  winningItem: string | null;
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

export default function DashboardPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"activas" | "historial">("activas");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/claims", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setTickets([]);
            setLoading(false);
            return;
          }
          setTickets(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar tickets:", err);
          setTickets([]);
          setLoading(false);
        });
    }
  }, [auth]);

  const activeTickets = tickets.filter((t) => t.raffle.status === "ACTIVE");
  const historyTickets = tickets.filter((t) => t.raffle.status === "FINISHED");

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

  async function handleClaimPrize(ticketId: string) {
    if (!auth?.token) return;
    if (!confirm("¿Deseas reclamar el premio de este ticket?")) return;

    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ ticketId })
      });

      if (res.ok) {
        alert("Premio reclamado exitosamente. Un administrador procesará tu solicitud.");
        // Recargar tickets
        const data = await fetch("/api/claims", { headers: { Authorization: `Bearer ${auth.token}` } }).then((r) => r.json());
        setTickets(Array.isArray(data) ? data : []);
      } else {
        const error = await res.json();
        alert(error.error || "Error al reclamar premio");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al reclamar premio");
    }
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <>
        <NavBar />
        <main className="container" style={{ paddingTop: "2rem", display: "grid", gap: "1.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h1>MI CUENTA</h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>Ir a MI CUENTA →</Link>
            <Link href="/" style={{ color: "#85BB65", textDecoration: "none" }}>← Volver al inicio</Link>
          </div>
        </div>

        <section className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
          <h2 style={{ margin: 0 }}>Comprar cupos</h2>
          <p style={{ color: "#cbd5e1", margin: 0 }}>Compra directa por sorteo; los cupos se apartan al pagar.</p>
          <Link 
            href="/" 
            style={{ 
              padding: ".75rem 1.5rem", 
              background: "#85BB65", 
              color: "#3E3E3C", 
              borderRadius: "8px", 
              fontWeight: 700, 
              width: "fit-content",
              textDecoration: "none",
              display: "inline-block"
            }}
          >
            Ver sorteos disponibles
          </Link>
        </section>

        <section className="card" style={{ display: "grid", gap: "1rem", padding: "1.5rem" }}>
          <h2 style={{ margin: 0 }}>Mis jugadas</h2>
          
          {/* Pestañas */}
          <div style={{ display: "flex", gap: ".5rem", borderBottom: "1px solid #1f2937" }}>
            <button
              onClick={() => setActiveTab("activas")}
              style={{
                padding: ".75rem 1.5rem",
                background: activeTab === "activas" ? "#85BB65" : "transparent",
                color: activeTab === "activas" ? "#0b1221" : "#94a3b8",
                border: "none",
                borderBottom: activeTab === "activas" ? "2px solid #85BB65" : "2px solid transparent",
                borderRadius: "8px 8px 0 0",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Activas {mounted && `(${activeTickets.length})`}
            </button>
            <button
              onClick={() => setActiveTab("historial")}
              style={{
                padding: ".75rem 1.5rem",
                background: activeTab === "historial" ? "#85BB65" : "transparent",
                color: activeTab === "historial" ? "#0b1221" : "#94a3b8",
                border: "none",
                borderBottom: activeTab === "historial" ? "2px solid #85BB65" : "2px solid transparent",
                borderRadius: "8px 8px 0 0",
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.2s"
              }}
            >
              Historial {mounted && `(${historyTickets.length})`}
            </button>
          </div>

          {/* Contenido de pestañas */}
          {loading ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>Cargando...</div>
          ) : activeTab === "activas" ? (
            activeTickets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                No tienes tickets activos
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                {activeTickets.map((ticket) => (
                  <div key={ticket.id} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
                    <div style={{ display: "grid", gap: ".5rem" }}>
                      <h3 style={{ margin: 0 }}>{ticket.raffle.title}</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".75rem", fontSize: ".875rem", color: "#94a3b8" }}>
                        <div><strong>Tipo:</strong> {getTypeLabel(ticket.raffle.type)}</div>
                        <div><strong>Cupos comprados:</strong> {Array.isArray(ticket.items) ? ticket.items.length : 0}</div>
                        <div><strong>Total pagado:</strong> {Number(ticket.totalPaid).toFixed(2)} Bs</div>
                        <div><strong>Fecha:</strong> {new Date(ticket.purchasedAt).toLocaleDateString()}</div>
                      </div>
                      <div style={{ marginTop: ".5rem" }}>
                        <strong style={{ color: "#85BB65" }}>Cupos: </strong>
                        <span style={{ color: "#e2e8f0" }}>
                          {Array.isArray(ticket.items) ? ticket.items.join(", ") : "N/A"}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            historyTickets.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
                No tienes tickets en el historial
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem", marginTop: "1rem" }}>
                {historyTickets.map((ticket) => {
                  // Verificar si el ticket es ganador
                  const ticketItems = Array.isArray(ticket.items) ? ticket.items : [];
                  const winningItems = ticket.raffle.winningItem ? ticket.raffle.winningItem.split(", ").map((w: string) => w.trim()) : [];
                  const isWinner = ticketItems.some((item: string) => winningItems.includes(item));
                  const hasClaim = ticket.prizeClaim !== null;
                  const canClaim = isWinner && !hasClaim && (ticket.status === "WIN" || isWinner);

                  return (
                    <div key={ticket.id} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
                      <div style={{ display: "grid", gap: ".5rem" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                          <h3 style={{ margin: 0 }}>{ticket.raffle.title}</h3>
                          {isWinner && (
                            <span style={{ padding: ".25rem .75rem", background: "#85BB65", borderRadius: "6px", fontSize: ".75rem", color: "#3E3E3C", fontWeight: 700 }}>
                              🎉 GANADOR
                            </span>
                          )}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".75rem", fontSize: ".875rem", color: "#94a3b8" }}>
                          <div><strong>Tipo:</strong> {getTypeLabel(ticket.raffle.type)}</div>
                          <div><strong>Cupos comprados:</strong> {Array.isArray(ticket.items) ? ticket.items.length : 0}</div>
                          <div><strong>Total pagado:</strong> {Number(ticket.totalPaid).toFixed(2)} Bs</div>
                          <div><strong>Fecha:</strong> {new Date(ticket.purchasedAt).toLocaleDateString()}</div>
                        </div>
                        <div style={{ marginTop: ".5rem" }}>
                          <strong style={{ color: "#85BB65" }}>Cupos: </strong>
                          <span style={{ color: "#e2e8f0" }}>
                            {Array.isArray(ticket.items) ? ticket.items.map(item => getItemWithEmoji(item, ticket.raffle.type)).join(", ") : "N/A"}
                          </span>
                        </div>
                        {ticket.raffle.winningItem && (
                          <div style={{ marginTop: ".5rem", padding: ".75rem", background: isWinner ? "rgba(133, 187, 101, 0.1)" : "rgba(107, 114, 128, 0.1)", borderRadius: "8px" }}>
                            <strong>Ganador del sorteo: </strong>
                            <span style={{ color: isWinner ? "#85BB65" : "#94a3b8" }}>
                              {ticket.raffle.winningItem}
                            </span>
                          </div>
                        )}
                        {canClaim && (
                          <button
                            onClick={() => handleClaimPrize(ticket.id)}
                            style={{
                              marginTop: ".5rem",
                              padding: ".75rem 1.5rem",
                              background: "#f59e0b",
                              color: "#3E3E3C",
                              border: "none",
                              borderRadius: "8px",
                              fontWeight: 700,
                              cursor: "pointer",
                              width: "fit-content"
                            }}
                          >
                            🎁 Reclamar Premio
                          </button>
                        )}
                        {hasClaim && (
                          <div style={{ marginTop: ".5rem", padding: ".75rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", color: "#f59e0b" }}>
                            <strong>Estado del reclamo: </strong>
                            {ticket.prizeClaim?.status === "REQUESTED" && "Pendiente de procesamiento"}
                            {ticket.prizeClaim?.status === "PROCESSING" && "En proceso"}
                            {ticket.prizeClaim?.status === "PAID" && "✅ Pagado"}
                            {ticket.prizeClaim?.status === "REJECTED" && "❌ Rechazado"}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </section>
        </main>
      </>
    </AuthGuard>
  );
}

