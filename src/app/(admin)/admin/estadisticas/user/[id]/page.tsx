"use client";
import { AdminNavBar } from "../../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../../lib/clientAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useParams, useRouter, useSearchParams } from "next/navigation";

type UserStats = {
  user: {
    id: string;
    name: string;
    email: string;
    username: string | null;
    phoneNumber: string | null;
    nationalId: string | null;
    bank: string | null;
    createdAt: string;
  };
  totalSpent: number;
  purchaseCount: number;
  chartData: Array<{ date: string; value: number }>;
  tickets: Array<{
    totalPaid: number;
    purchasedAt: string;
    raffleTitle: string;
    raffleType: string;
  }>;
  period: { start: string; end: string };
};

function UserStatsPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [period, setPeriod] = useState(searchParams.get("period") || "7d");
  const [customStartDate, setCustomStartDate] = useState(searchParams.get("startDate") || "");
  const [customEndDate, setCustomEndDate] = useState(searchParams.get("endDate") || "");

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth?.token) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token && params.id) {
      loadUserStats();
    }
  }, [auth, params.id, period, customStartDate, customEndDate]);

  function loadUserStats() {
    if (!auth?.token || !params.id) return;
    setLoading(true);

    const apiParams = new URLSearchParams();
    if (period === "custom") {
      if (customStartDate) apiParams.append("startDate", customStartDate);
      if (customEndDate) apiParams.append("endDate", customEndDate);
      apiParams.append("period", "custom");
    } else {
      apiParams.append("period", period);
    }

    fetch(`/api/admin/estadisticas/user/${params.id}?${apiParams.toString()}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setStats(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        alert(err.message || "Error al cargar estadísticas del usuario");
        setLoading(false);
      });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
  }

  if (loading) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando estadísticas del usuario...</div>
        </main>
      </>
    );
  }

  if (!stats) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Usuario no encontrado</div>
        </main>
      </>
    );
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <button
          className="button"
          onClick={() => router.push("/admin/estadisticas")}
          style={{ marginBottom: "2rem", padding: "0.75rem 1.5rem" }}
        >
          ← Volver a Estadísticas
        </button>

        <h1 style={{ color: "var(--text-primary)", marginBottom: "2rem" }}>Estadísticas de Usuario</h1>

        {/* User Info */}
        <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
          <h2 style={{ marginTop: 0 }}>Datos del Usuario</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "1rem" }}>
            <div>
              <strong>Nombre:</strong> {stats.user.name}
            </div>
            <div>
              <strong>Email:</strong> {stats.user.email}
            </div>
            {stats.user.username && (
              <div>
                <strong>Usuario:</strong> {stats.user.username}
              </div>
            )}
            {stats.user.phoneNumber && (
              <div>
                <strong>Teléfono:</strong> {stats.user.phoneNumber}
              </div>
            )}
            {stats.user.nationalId && (
              <div>
                <strong>Cédula:</strong> {stats.user.nationalId}
              </div>
            )}
            {stats.user.bank && (
              <div>
                <strong>Banco:</strong> {stats.user.bank}
              </div>
            )}
            <div>
              <strong>Fecha de Registro:</strong> {formatDate(stats.user.createdAt)}
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Total Gastado</h3>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--color-primary)" }}>
              {stats.totalSpent.toFixed(2)} Bs.
            </p>
          </div>
          <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
            <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Total de Compras</h3>
            <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>{stats.purchaseCount}</p>
          </div>
        </div>

        {/* Period Selector */}
        <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
          <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Período</label>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", alignItems: "center" }}>
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                if (e.target.value !== "custom") {
                  setCustomStartDate("");
                  setCustomEndDate("");
                }
              }}
              style={{ padding: "0.75rem", minWidth: "200px" }}
            >
              <option value="24h">Últimas 24 Horas</option>
              <option value="7d">Últimos 7 Días</option>
              <option value="30d">Últimos 30 Días</option>
              <option value="90d">Últimos 90 Días</option>
              <option value="180d">Últimos 180 Días</option>
              <option value="365d">Últimos 365 Días</option>
              <option value="year">Año</option>
              <option value="all">Todo el Tiempo</option>
              <option value="custom">Personalizado</option>
            </select>
            {period === "custom" && (
              <>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  style={{ padding: "0.75rem" }}
                />
                <span>hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ padding: "0.75rem" }}
                />
              </>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Gráfico de Compras</h3>
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value: number | undefined) => value !== undefined ? `${value.toFixed(2)} Bs.` : "0 Bs."} />
                <Legend />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} name="Compras (Bs.)" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>No hay datos para mostrar en el período seleccionado</p>
          )}
        </div>

        {/* Tickets List */}
        <div className="card" style={{ padding: "1.5rem" }}>
          <h3 style={{ marginTop: 0 }}>Historial de Compras</h3>
          {stats.tickets.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f3f4f6" }}>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Fecha</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Sorteo</th>
                    <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Tipo</th>
                    <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 600 }}>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.tickets.map((ticket, index) => (
                    <tr key={index} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{formatDate(ticket.purchasedAt)}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{ticket.raffleTitle}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{ticket.raffleType}</td>
                      <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                        {ticket.totalPaid.toFixed(2)} Bs.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ textAlign: "center", color: "var(--text-tertiary)", padding: "2rem" }}>No hay compras en el período seleccionado</p>
          )}
        </div>
      </main>
    </>
  );
}

export default function UserStatsPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <UserStatsPageContent />
    </AuthGuard>
  );
}
