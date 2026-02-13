"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

function HistorialPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [raffles, setRaffles] = useState<any[]>([]);
  const [filters, setFilters] = useState({ day: "", month: "", year: "", type: "" });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.day) params.append("day", filters.day);
      if (filters.month) params.append("month", filters.month);
      if (filters.year) params.append("year", filters.year);
      if (filters.type) params.append("type", filters.type);
      fetch(`/api/admin/history?${params}`, { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setRaffles([]);
            setLoading(false);
            return;
          }
          setRaffles(Array.isArray(data) ? data : []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar historial:", err);
          setRaffles([]);
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, [auth, filters]);

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

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Historial de Dinámicas</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
          </div>
        </div>
        <div className="card" style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
          <h3 style={{ margin: 0 }}>Filtros</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: ".75rem" }}>
            <input
              type="number"
              placeholder="Día"
              min="1"
              max="31"
              value={filters.day}
              onChange={(e) => setFilters({ ...filters, day: e.target.value })}
              style={{ padding: ".5rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <input
              type="number"
              placeholder="Mes"
              min="1"
              max="12"
              value={filters.month}
              onChange={(e) => setFilters({ ...filters, month: e.target.value })}
              style={{ padding: ".5rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <input
              type="number"
              placeholder="Año"
              min="2020"
              max="2100"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: e.target.value })}
              style={{ padding: ".5rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <select
              value={filters.type}
              onChange={(e) => setFilters({ ...filters, type: e.target.value })}
              style={{ padding: ".5rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            >
              <option value="">Todos los tipos</option>
              <option value="NUMBERS">NÚMEROS</option>
              <option value="ANIMALS">ANIMALES</option>
              <option value="STATES">ESTADOS</option>
              <option value="FLAGS">BANDERAS</option>
              <option value="ZODIAC">SIGNOS ZODIACALES</option>
            </select>
          </div>
        </div>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : raffles.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No hay sorteos ejecutados en el historial.</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {raffles.map((raffle) => (
              <div key={raffle.id} className="card" style={{ display: "grid", gap: ".75rem", padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", flexWrap: "wrap", gap: "1rem" }}>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ margin: "0 0 .5rem", fontSize: "1.25rem" }}>{raffle.title}</h3>
                    <div style={{ display: "grid", gap: ".5rem", color: "var(--text-secondary)", fontSize: ".875rem" }}>
                      <div><strong>Tipo:</strong> {raffle.type}</div>
                      <div><strong>Ejecutado:</strong> {raffle.executedAt ? new Date(raffle.executedAt).toLocaleString("es-VE", { dateStyle: "long", timeStyle: "short" }) : "N/A"}</div>
                      <div><strong>Ganador(es):</strong> <span style={{ color: "var(--color-primary)", fontWeight: 700 }}>{raffle.winningItem || "N/A"}</span></div>
                      {raffle.winnerUsers && Array.isArray(raffle.winnerUsers) && raffle.winnerUsers.length > 0 && (
                        <div>
                          <strong>Usuario(s) ganador(es):</strong>{" "}
                          {raffle.winnerUsers.map((u: { id: string; name: string; username: string | null }) => (
                            <Link key={u.id} href={`/admin/estadisticas/user/${u.id}`} style={{ color: "var(--color-primary)", fontWeight: 600, textDecoration: "underline", marginRight: ".5rem" }}>
                              {u.name || u.username || u.id}
                            </Link>
                          ))}
                        </div>
                      )}
                      {raffle.prizes && Array.isArray(raffle.prizes) && raffle.prizes.length > 0 && (
                        <div>
                          <strong>Premios:</strong>
                          <div style={{ color: "#228D57", fontWeight: 700, fontSize: "1.3125rem", fontFamily: "var(--font-oswald), sans-serif", whiteSpace: "pre-line", marginTop: ".25rem" }}>
                            {formatPrizesList(raffle.prizes)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function HistorialPage() {
  return (
    <AuthGuard requiredRole={["SUPERADMIN", "MASTER"]}>
      <HistorialPageContent />
    </AuthGuard>
  );
}
