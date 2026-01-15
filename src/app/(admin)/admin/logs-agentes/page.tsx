"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import type { StoredAuth } from "../../../../lib/clientAuth";

type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  ip: string | null;
  actor: { name: string; email: string; role: string } | null;
  meta: any;
};

function LogsAgentesPageContent() {
  const [auth, setAuth] = useState<StoredAuth | null>(null);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
  }, []);

  useEffect(() => {
    if (!auth?.token) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    let url = "/api/admin/logs/agents";
    const params = new URLSearchParams();
    if (dateFrom) params.append("dateFrom", dateFrom);
    if (dateTo) params.append("dateTo", dateTo);
    if (params.toString()) url += "?" + params.toString();

    fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((err) => {
            throw new Error(err.error || "Error al cargar logs");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setError("Formato de datos inválido");
          setLogs([]);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar logs:", err);
        setError(err.message || "Error al cargar logs");
        setLogs([]);
        setLoading(false);
      });
  }, [auth, dateFrom, dateTo]);

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      LOGIN: "Inicio de Sesión",
      CREATE_RAFFLE: "Apertura de Sorteo",
      EXECUTE_RAFFLE: "Ejecución de Sorteo",
      MARK_CLAIM_PAID: "Pago de Premio (Aprobado)",
      REJECT_CLAIM: "Pago de Premio (Rechazado)",
      CONFIRM_PENDING_SLOT: "Confirmación de Cupo",
      REJECT_PENDING_SLOT: "Rechazo de Cupo"
    };
    return labels[action] || action;
  };

  const formatMeta = (meta: any, action: string) => {
    if (!meta) return "-";
    
    if (action === "LOGIN") {
      return `Email: ${meta.email || "N/A"} | Estado: ${meta.status || "N/A"}`;
    }
    
    if (action === "CREATE_RAFFLE") {
      return `Título: ${meta.title || "N/A"} | Tipo: ${meta.type || "N/A"} | Precio: ${meta.pricePerSlot || "N/A"} Bs. | Cupos: ${meta.slots || "N/A"} | Ganadores: ${meta.winnersCount || "N/A"}`;
    }
    
    if (action === "EXECUTE_RAFFLE") {
      return `Título: ${meta.title || "N/A"} | Tipo: ${meta.type || "N/A"} | Ganadores: ${meta.winners || "N/A"} | Premios: ${Array.isArray(meta.prizes) ? meta.prizes.join(", ") : "N/A"}`;
    }
    
    if (action === "MARK_CLAIM_PAID" || action === "REJECT_CLAIM") {
      return `Usuario: ${meta.userName || "N/A"} (${meta.userEmail || "N/A"}) | Sorteo: ${meta.raffleTitle || "N/A"} | Acción: ${meta.action || "N/A"}${meta.paymentRef ? ` | Ref. Pago: ${meta.paymentRef}` : ""}`;
    }
    
    if (action === "CONFIRM_PENDING_SLOT" || action === "REJECT_PENDING_SLOT") {
      return `Usuario: ${meta.userName || "N/A"} (${meta.userEmail || "N/A"}) | Sorteo: ${meta.raffleTitle || "N/A"} | Cupo: ${meta.value || "N/A"} | Acción: ${meta.action || "N/A"}${meta.paymentMobileRef ? ` | Ref. Pago: ${meta.paymentMobileRef}` : ""}`;
    }
    
    return JSON.stringify(meta).substring(0, 100);
  };

  const clearFilters = () => {
    setDateFrom("");
    setDateTo("");
  };

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1>Logs de Agentes</h1>
        
        {/* Filtros */}
        <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h3 style={{ margin: "0 0 1rem", fontSize: "1.125rem" }}>Filtros</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", color: "#94a3b8" }}>
                Fecha Desde
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".5rem",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e2e8f0"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", color: "#94a3b8" }}>
                Fecha Hasta
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".5rem",
                  background: "#1f2937",
                  border: "1px solid #374151",
                  borderRadius: "8px",
                  color: "#e2e8f0"
                }}
              />
            </div>
            <div>
              <button
                onClick={clearFilters}
                style={{
                  padding: ".5rem 1rem",
                  background: "#374151",
                  color: "#e2e8f0",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  width: "100%"
                }}
              >
                Limpiar Filtros
              </button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : error ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#ef4444" }}>
            <p style={{ margin: 0 }}>Error: {error}</p>
            <button
              onClick={() => {
                if (auth?.token) {
                  setError(null);
                  setLoading(true);
                  let url = "/api/admin/logs/agents";
                  const params = new URLSearchParams();
                  if (dateFrom) params.append("dateFrom", dateFrom);
                  if (dateTo) params.append("dateTo", dateTo);
                  if (params.toString()) url += "?" + params.toString();

                  fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
                    .then((r) => {
                      if (!r.ok) {
                        return r.json().then((err) => {
                          throw new Error(err.error || "Error al cargar logs");
                        });
                      }
                      return r.json();
                    })
                    .then((data) => {
                      if (Array.isArray(data)) {
                        setLogs(data);
                      } else {
                        setError("Formato de datos inválido");
                        setLogs([]);
                      }
                      setLoading(false);
                    })
                    .catch((err) => {
                      console.error("Error al cargar logs:", err);
                      setError(err.message || "Error al cargar logs");
                      setLogs([]);
                      setLoading(false);
                    });
                }
              }}
              style={{
                marginTop: "1rem",
                padding: ".5rem 1rem",
                background: "#3E3E3C",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Reintentar
            </button>
          </div>
        ) : logs.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>No hay logs registrados</div>
        ) : (
          <div className="card" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #1f2937" }}>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>Fecha y Hora</th>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>Agente</th>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>Rol</th>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>Acción</th>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>Detalles</th>
                  <th style={{ padding: ".75rem", textAlign: "left", fontSize: ".875rem", fontWeight: 600 }}>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      {new Date(log.createdAt).toLocaleString("es-VE", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      {log.actor?.name || "N/A"}
                      <br />
                      <span style={{ color: "#94a3b8", fontSize: ".75rem" }}>{log.actor?.email || ""}</span>
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      <span style={{
                        padding: ".25rem .5rem",
                        borderRadius: "4px",
                        background: log.actor?.role === "SUPERADMIN" ? "#3E3E3C" : "#85BB65",
                        color: "#fff",
                        fontSize: ".75rem"
                      }}>
                        {log.actor?.role || "N/A"}
                      </span>
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                      <strong>{getActionLabel(log.action)}</strong>
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".875rem", color: "#94a3b8", maxWidth: "400px", wordBreak: "break-word" }}>
                      {formatMeta(log.meta, log.action)}
                    </td>
                    <td style={{ padding: ".75rem", fontSize: ".75rem", color: "#6b7280" }}>
                      {log.ip || "N/A"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  );
}

export default function LogsAgentesPage() {
  return (
    <AuthGuard requiredRole={["SUPERADMIN", "MASTER"]}>
      <LogsAgentesPageContent />
    </AuthGuard>
  );
}
