"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { useRouter } from "next/navigation";

type Payment = {
  id: string;
  fecha: string;
  nombreUsuario: string;
  emailUsuario: string;
  metodoPago: string;
  monto: number;
  referenciaPago: string | null;
  cuposComprados: string;
  cantidadCupos: number;
  tituloSorteo: string;
  tipoSorteo: string;
};

type ReferralVisit = {
  id: string;
  fecha: string;
  nombreLink: string;
  codigoLink: string;
  direccionIP: string;
  pais: string;
  userAgent: string;
  registrado: boolean;
  comprado: boolean;
};

/** Respuesta contable del módulo Estadísticas (fuente: lib/accounting). */
type IncomeData = {
  ingresos: number;
  egresos: number;
  ganancias: number;
  growthPercentage: number;
  netGrowthPercentage: number;
  chartData: Array<{ date: string; ingresos: number; egresos: number }>;
  period: { start: string; end: string };
};

type ReferralsData = {
  withReferral: number;
  withoutReferral: number;
  total: number;
  growthPercentage: number;
  chartData: Array<{ date: string; withReferral: number; withoutReferral: number; total: number }>;
  period: { start: string; end: string };
};

type TopUser = {
  id: string;
  name: string;
  email: string;
  totalSpent: number;
  purchaseCount: number;
};

/** Calcula el rango de fechas del período (igual lógica que la API) para Lista de Pagos y filtros. */
function getPeriodRange(
  period: string,
  customStartDate: string,
  customEndDate: string
): { start: string; end: string } {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  if (period === "custom" && customStartDate && customEndDate) {
    start = new Date(customStartDate + "T00:00:00");
    end = new Date(customEndDate + "T23:59:59");
  } else if (period === "24h") {
    start.setHours(start.getHours() - 24);
  } else if (period === "7d") {
    start.setDate(start.getDate() - 7);
  } else if (period === "30d") {
    start.setDate(start.getDate() - 30);
  } else if (period === "90d") {
    start.setDate(start.getDate() - 90);
  } else if (period === "180d") {
    start.setDate(start.getDate() - 180);
  } else if (period === "365d") {
    start.setDate(start.getDate() - 365);
  } else if (period === "year") {
    start = new Date(now.getFullYear(), 0, 1);
    end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
  } else if (period === "all") {
    start = new Date("2000-01-01T00:00:00.000Z");
  } else {
    start.setDate(start.getDate() - 7);
  }
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10)
  };
}

function EstadisticasPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"income" | "referrals" | "topUsers">("income");
  const [period, setPeriod] = useState("7d");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [incomeData, setIncomeData] = useState<IncomeData | null>(null);
  const [referralsData, setReferralsData] = useState<ReferralsData | null>(null);
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth?.token) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadData();
    }
  }, [auth, activeTab, period, customStartDate, customEndDate]);

  function loadData() {
    if (!auth?.token) return;
    setLoading(true);

    const params = new URLSearchParams();
    if (period === "custom") {
      if (customStartDate) params.append("startDate", customStartDate);
      if (customEndDate) params.append("endDate", customEndDate);
      params.append("period", "custom");
    } else {
      params.append("period", period);
    }

    if (activeTab === "income") {
      params.append("type", "income");
      fetch(`/api/admin/estadisticas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setIncomeData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error:", err);
          alert(err.message || "Error al cargar estadísticas de ingresos");
          setLoading(false);
        });
    } else if (activeTab === "referrals") {
      params.append("type", "referrals");
      fetch(`/api/admin/estadisticas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setReferralsData(data);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error:", err);
          alert(err.message || "Error al cargar estadísticas de referencias");
          setLoading(false);
        });
    } else if (activeTab === "topUsers") {
      if (auth.user.role !== "MASTER") {
        setLoading(false);
        return;
      }
      params.append("type", "topUsers");
      fetch(`/api/admin/estadisticas?${params.toString()}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) throw new Error(data.error);
          setTopUsers(data.users || []);
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error:", err);
          alert(err.message || "Error al cargar top usuarios");
          setLoading(false);
        });
    }
  }

  function handleViewUser(userId: string) {
    router.push(`/admin/estadisticas/user/${userId}?period=${period}&startDate=${customStartDate || ""}&endDate=${customEndDate || ""}`);
  }

  async function handleDownloadPDF() {
    if (!auth?.token || !incomeData) {
      alert("No hay datos para generar el PDF");
      return;
    }

    try {
      // Obtener datos completos para el PDF
      const params = new URLSearchParams();
      if (period === "custom") {
        if (customStartDate) params.append("startDate", customStartDate);
        if (customEndDate) params.append("endDate", customEndDate);
        params.append("period", "custom");
      } else {
        params.append("period", period);
      }

      const response = await fetch(`/api/admin/estadisticas/pdf?${params.toString()}`, {
        headers: { Authorization: `Bearer ${auth.token}` }
      });

      if (!response.ok) {
        throw new Error("Error al generar PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      
      // Nombre del archivo con fechas
      const startDate = period === "custom" && customStartDate
        ? new Date(customStartDate).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")
        : new Date(incomeData.period.start).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
      const endDate = period === "custom" && customEndDate
        ? new Date(customEndDate).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-")
        : new Date(incomeData.period.end).toLocaleDateString("es-ES", { day: "2-digit", month: "2-digit", year: "numeric" }).replace(/\//g, "-");
      
      a.download = `Reporte_Administrativo_LuckyLY_${startDate}_${endDate}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Error al generar el PDF");
    }
  }

  const isMaster = auth?.user?.role === "MASTER";

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1 style={{ color: "var(--text-primary)", marginBottom: "2rem" }}>Estadísticas</h1>

        {/* Tabs */}
        <div style={{ display: "flex", gap: "1rem", marginBottom: "2rem", borderBottom: "2px solid #e5e7eb" }}>
          <button
            onClick={() => setActiveTab("income")}
            style={{
              padding: "1rem 2rem",
              background: activeTab === "income" ? "#3E3E3C" : "transparent",
              color: activeTab === "income" ? "#fff" : "#3E3E3C",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              borderBottom: activeTab === "income" ? "2px solid #3E3E3C" : "2px solid transparent",
              marginBottom: "-2px"
            }}
          >
            Estado de Cuenta
          </button>
          <button
            onClick={() => setActiveTab("referrals")}
            style={{
              padding: "1rem 2rem",
              background: activeTab === "referrals" ? "#3E3E3C" : "transparent",
              color: activeTab === "referrals" ? "#fff" : "#3E3E3C",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              borderBottom: activeTab === "referrals" ? "2px solid #3E3E3C" : "2px solid transparent",
              marginBottom: "-2px"
            }}
          >
            Referencias
          </button>
          {isMaster && (
            <button
              onClick={() => setActiveTab("topUsers")}
              style={{
                padding: "1rem 2rem",
                background: activeTab === "topUsers" ? "#3E3E3C" : "transparent",
                color: activeTab === "topUsers" ? "#fff" : "#3E3E3C",
                border: "none",
                cursor: "pointer",
                fontWeight: 600,
                borderBottom: activeTab === "topUsers" ? "2px solid #3E3E3C" : "2px solid transparent",
                marginBottom: "-2px"
              }}
            >
              Top Usuarios
            </button>
          )}
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
                  placeholder="Fecha inicio"
                />
                <span>hasta</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  style={{ padding: "0.75rem" }}
                  placeholder="Fecha fin"
                />
              </>
            )}
          </div>
        </div>

        {/* Income Tab */}
        {activeTab === "income" && (
          <div>
            {loading ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando estadísticas...</div>
            ) : incomeData ? (
              <>
                <p style={{ marginBottom: "1.5rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
                  Contabilidad del <strong>período seleccionado</strong>: ingresos por fecha de compra (purchasedAt), egresos por fecha de pago (processedAt).
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>Ingresos</h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Todos los pagos de usuarios (compras confirmadas)</p>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>
                      {incomeData.ingresos.toFixed(2)} Bs.
                    </p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>Egresos</h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Pago de premios a ganadores (Premios Bs. de CREAR SORTEO)</p>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#ef4444" }}>
                      -{incomeData.egresos.toFixed(2)} Bs.
                    </p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center", background: "linear-gradient(135deg, #85BB65 0%, #64c27b 100%)" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "#fff", marginBottom: "0.25rem" }}>Ganancias</h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "rgba(255,255,255,0.9)", marginBottom: "0.5rem" }}>Ingresos − Egresos (restante)</p>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#fff" }}>
                      {incomeData.ganancias.toFixed(2)} Bs.
                    </p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.25rem" }}>Crecimiento Neto (48 h)</h3>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>% variación ganancias netas vs. 48 h anteriores</p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "2rem",
                        fontWeight: 700,
                        color: incomeData.netGrowthPercentage >= 0 ? "#10b981" : "#ef4444"
                      }}
                    >
                      {incomeData.netGrowthPercentage >= 0 ? "+" : ""}
                      {incomeData.netGrowthPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>
                
                {/* Botón de Descarga PDF */}
                <div style={{ marginBottom: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => handleDownloadPDF()}
                    style={{
                      padding: "0.75rem 1.5rem",
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: "0.875rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem"
                    }}
                  >
                    <span>📄</span>
                    Descargar PDF
                  </button>
                </div>

                <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                  <h3 style={{ marginTop: 0 }}>Gráfico de Ingresos y Egresos</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={incomeData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v} Bs.`} />
                      <Tooltip
                        formatter={(value: number | undefined) => (value !== undefined ? `${Number(value).toFixed(2)} Bs.` : "0 Bs.")}
                        labelFormatter={(label) => `Fecha: ${label}`}
                      />
                      <Legend />
                      <Line type="monotone" dataKey="ingresos" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="Ingresos (Bs.)" />
                      <Line type="monotone" dataKey="egresos" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Premios pagados (Bs.)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista de Pagos: mismo rango que Ingresos Totales (período seleccionado) */}
                <PaymentList
                  auth={auth}
                  computedPeriodRange={getPeriodRange(period, customStartDate, customEndDate)}
                  period={period}
                  customStartDate={customStartDate}
                  customEndDate={customEndDate}
                />
              </>
            ) : null}
          </div>
        )}

        {/* Referrals Tab */}
        {activeTab === "referrals" && (
          <div>
            {loading ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando estadísticas...</div>
            ) : referralsData ? (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1.5rem", marginBottom: "2rem" }}>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Con Referido</h3>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#8b5cf6" }}>{referralsData.withReferral}</p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Sin Referido</h3>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "#10b981" }}>{referralsData.withoutReferral}</p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Total</h3>
                    <p style={{ margin: 0, fontSize: "2rem", fontWeight: 700, color: "var(--text-primary)" }}>{referralsData.total}</p>
                  </div>
                  <div className="card" style={{ padding: "1.5rem", textAlign: "center" }}>
                    <h3 style={{ margin: 0, fontSize: "0.875rem", fontWeight: 600, color: "var(--text-tertiary)", marginBottom: "0.5rem" }}>Crecimiento</h3>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "2rem",
                        fontWeight: 700,
                        color: referralsData.growthPercentage >= 0 ? "#10b981" : "#ef4444"
                      }}
                    >
                      {referralsData.growthPercentage >= 0 ? "+" : ""}
                      {referralsData.growthPercentage.toFixed(2)}%
                    </p>
                  </div>
                </div>

                <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
                  <h3 style={{ marginTop: 0 }}>Gráfico de Referencias</h3>
                  <ResponsiveContainer width="100%" height={400}>
                    <LineChart data={referralsData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="withReferral" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Con Referido" />
                      <Line type="monotone" dataKey="withoutReferral" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} name="Sin Referido" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Lista de Referencias */}
                <ReferralList auth={auth} period={period} customStartDate={customStartDate} customEndDate={customEndDate} />
              </>
            ) : null}
          </div>
        )}

        {/* Top Users Tab */}
        {activeTab === "topUsers" && isMaster && (
          <div>
            {loading ? (
              <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando usuarios...</div>
            ) : topUsers.length > 0 ? (
              <div className="card" style={{ padding: "1.5rem" }}>
                <h3 style={{ marginTop: 0 }}>Top Usuarios por Compras</h3>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ background: "#f3f4f6" }}>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>#</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Usuario</th>
                        <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Email</th>
                        <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 600 }}>Total Gastado</th>
                        <th style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", fontWeight: 600 }}>Compras</th>
                        <th style={{ padding: "0.75rem", textAlign: "center", fontSize: "0.875rem", fontWeight: 600 }}>Acción</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topUsers.map((user, index) => (
                        <tr key={user.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{index + 1}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{user.name}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{user.email}</td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 600, color: "var(--color-primary)" }}>
                            {user.totalSpent.toFixed(2)} Bs.
                          </td>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "center" }}>{user.purchaseCount}</td>
                          <td style={{ padding: "0.75rem", textAlign: "center" }}>
                            <button
                              className="button"
                              onClick={() => handleViewUser(user.id)}
                              style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}
                            >
                              Ver Detalles
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="card" style={{ padding: "2rem", textAlign: "center" }}>No hay usuarios con compras en el período seleccionado</div>
            )}
          </div>
        )}
      </main>
    </>
  );
}

// Lista de Pagos: compras (tickets CONFIRMED) en el período seleccionado; alineada con Ingresos Totales
function PaymentList({
  auth,
  computedPeriodRange,
  period,
  customStartDate,
  customEndDate
}: {
  auth: any;
  computedPeriodRange: { start: string; end: string };
  period: string;
  customStartDate: string;
  customEndDate: string;
}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: customStartDate || "",
    endDate: customEndDate || "",
    userSearch: "",
    paymentMethod: "",
    raffleName: ""
  });
  const [userSuggestions, setUserSuggestions] = useState<Array<{ id: string; name: string; email: string }>>([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [raffles, setRaffles] = useState<Array<{ id: string; title: string }>>([]);

  // Cargar lista de sorteos al inicio
  useEffect(() => {
    if (auth?.token) {
      fetch("/api/raffles?includeNotApproved=true", {
        headers: { Authorization: `Bearer ${auth.token}` }
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setRaffles(data.map((r: any) => ({ id: r.id, title: r.title })));
          }
        })
        .catch(() => {});
    }
  }, [auth]);

  useEffect(() => {
    setPage(1);
  }, [computedPeriodRange.start, computedPeriodRange.end, filters.startDate, filters.endDate]);

  useEffect(() => {
    if (auth?.token) {
      loadPayments();
    }
  }, [auth, page, filters, selectedUserId, computedPeriodRange.start, computedPeriodRange.end]);

  // Buscar usuarios cuando se escribe en el campo de búsqueda
  useEffect(() => {
    if (filters.userSearch && filters.userSearch.length >= 2 && auth?.token) {
      const timeoutId = setTimeout(() => {
        fetch(`/api/admin/users?search=${encodeURIComponent(filters.userSearch)}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        })
          .then((r) => r.json())
          .then((data) => {
            if (!data.error && data.users && Array.isArray(data.users)) {
              setUserSuggestions(data.users.slice(0, 10)); // Limitar a 10 sugerencias
            } else if (!data.error && Array.isArray(data)) {
              setUserSuggestions(data.slice(0, 10)); // Fallback si es array directo
            }
          })
          .catch(() => {});
      }, 300); // Debounce de 300ms
      return () => clearTimeout(timeoutId);
    } else {
      setUserSuggestions([]);
    }
  }, [filters.userSearch, auth]);

  function loadPayments() {
    if (!auth?.token) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", "50");
    const startDate = filters.startDate || computedPeriodRange.start;
    const endDate = filters.endDate || computedPeriodRange.end;
    params.append("startDate", startDate);
    params.append("endDate", endDate);
    if (selectedUserId) params.append("userId", selectedUserId);
    if (filters.paymentMethod) params.append("paymentMethod", filters.paymentMethod);
    if (filters.raffleName) params.append("raffleId", filters.raffleName);

    setPaymentError(null);
    fetch(`/api/admin/estadisticas/payments?${params.toString()}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => {
        return r.json().then((data) => ({ ok: r.ok, data }));
      })
      .then(({ ok, data }) => {
        if (!ok || data.error) {
          setPayments([]);
          setTotalPages(1);
          setPaymentError(data?.error || "Error al cargar la lista de pagos.");
        } else {
          setPayments(data.payments || []);
          setTotalPages(data.pagination?.totalPages || 1);
          setPaymentError(null);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        setPayments([]);
        setTotalPages(1);
        setPaymentError("No se pudo cargar la lista. Reintenta más tarde.");
        setLoading(false);
      });
  }

  function handleFilterChange(key: string, value: string) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  const effectiveStart = filters.startDate || computedPeriodRange.start;
  const effectiveEnd = filters.endDate || computedPeriodRange.end;

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h3 style={{ marginTop: 0, marginBottom: "0.5rem" }}>Lista de Pagos</h3>
      <p style={{ margin: "0 0 1rem", fontSize: "0.875rem", color: "var(--text-tertiary)" }}>
        Compras confirmadas en el período seleccionado (mismo rango que Ingresos Totales).
      </p>
      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Fecha Inicio</label>
          <input
            type="date"
            value={effectiveStart}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Fecha Fin</label>
          <input
            type="date"
            value={effectiveEnd}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Usuario</label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              value={filters.userSearch}
              onChange={(e) => handleFilterChange("userSearch", e.target.value)}
              placeholder="Buscar por nombre o email..."
              style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            {userSuggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "var(--card-bg)", border: "1px solid var(--border-color)", borderRadius: "4px", marginTop: "0.25rem", maxHeight: "200px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}>
                {userSuggestions.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => {
                      setSelectedUserId(user.id);
                      setFilters({ ...filters, userSearch: `${user.name} (${user.email})` });
                      setUserSuggestions([]);
                    }}
                    style={{ padding: "0.5rem", cursor: "pointer", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)" }}
                    onMouseEnter={(e) => e.currentTarget.style.background = "var(--hover-bg)"}
                    onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
                  >
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text-primary)" }}>{user.name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{user.email}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {selectedUserId && (
            <button
              onClick={() => {
                setSelectedUserId("");
                setFilters({ ...filters, userSearch: "" });
              }}
              style={{ marginTop: "0.25rem", padding: "0.25rem 0.5rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer" }}
            >
              ✖ Limpiar selección
            </button>
          )}
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Método de Pago</label>
          <select
            value={filters.paymentMethod}
            onChange={(e) => handleFilterChange("paymentMethod", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
          >
            <option value="">Todos</option>
            <option value="BANESCO">Banesco</option>
            <option value="BINANCE">Binance</option>
            <option value="MOBILE">Pago Móvil</option>
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Nombre de Dinámica</label>
          <select
            value={filters.raffleName}
            onChange={(e) => handleFilterChange("raffleName", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
          >
            <option value="">Todos</option>
            {raffles.map((raffle) => (
              <option key={raffle.id} value={raffle.id}>{raffle.title}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={() => {
              setFilters({ startDate: "", endDate: "", userSearch: "", paymentMethod: "", raffleName: "" });
              setSelectedUserId("");
              setUserSuggestions([]);
              setPage(1);
            }}
            style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {paymentError && (
        <div style={{ marginBottom: "1rem", padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <span style={{ color: "#ef4444", fontSize: "0.875rem" }}>{paymentError}</span>
          <button type="button" onClick={() => loadPayments()} style={{ padding: "0.5rem 1rem", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}>
            Reintentar
          </button>
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>Cargando pagos...</div>
      ) : payments.length > 0 ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "900px" }}>
              <thead>
                <tr style={{ background: "var(--table-header-bg, #f3f4f6)" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Fecha</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Nombre del Usuario</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Método de Pago</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Cupos Comprados</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Referencia Bancaria</th>
                  <th style={{ padding: "0.75rem", textAlign: "right", fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)" }}>Monto</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} style={{ borderBottom: "1px solid var(--border-color, #e5e7eb)" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      {new Date(payment.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>
                      <div>{payment.nombreUsuario}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-tertiary)" }}>{payment.emailUsuario}</div>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", color: "var(--text-primary)" }}>{payment.metodoPago}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      <div style={{ fontWeight: 600, color: "#85BB65" }}>{payment.tipoSorteo}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                        {payment.cuposComprados || "N/A"} ({payment.cantidadCupos} cupo{payment.cantidadCupos !== 1 ? "s" : ""})
                      </div>
                      <div style={{ fontSize: "0.7rem", color: "var(--text-tertiary)" }}>{payment.tituloSorteo}</div>
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontFamily: "monospace", color: "var(--text-primary)" }}>
                      {payment.referenciaPago || "N/A"}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", textAlign: "right", fontWeight: 600, color: "#85BB65" }}>
                      {payment.monto.toFixed(2)} Bs.
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{ padding: "0.5rem 1rem", background: page === 1 ? "#e5e7eb" : "#3E3E3C", color: page === 1 ? "#9ca3af" : "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer" }}
              >
                Anterior
              </button>
              <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{ padding: "0.5rem 1rem", background: page === totalPages ? "#e5e7eb" : "#3E3E3C", color: page === totalPages ? "#9ca3af" : "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer" }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>No hay pagos en el período seleccionado</div>
      )}
    </div>
  );
}

// Componente para Lista de Referencias
function ReferralList({ auth, period, customStartDate, customEndDate }: { auth: any; period: string; customStartDate: string; customEndDate: string }) {
  const [visits, setVisits] = useState<ReferralVisit[]>([]);
  const [links, setLinks] = useState<Array<{ id: string; name: string }>>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    startDate: customStartDate || "",
    endDate: customEndDate || "",
    linkId: "",
    country: ""
  });

  useEffect(() => {
    if (auth?.token) {
      loadLinks();
      loadCountries();
      loadVisits();
    }
  }, [auth, page, filters, period, customStartDate, customEndDate]);

  function loadCountries() {
    if (!auth?.token) return;
    fetch("/api/admin/estadisticas/referrals?getCountries=true", {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && data.countries && Array.isArray(data.countries)) {
          setCountries(data.countries);
        }
      })
      .catch(() => {});
  }

  function loadLinks() {
    if (!auth?.token) return;
    fetch("/api/admin/referidos", {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (!data.error && Array.isArray(data)) {
          setLinks(data.map((link: any) => ({ id: link.id, name: link.name })));
        }
      })
      .catch(() => {});
  }

  function loadVisits() {
    if (!auth?.token) return;
    setLoading(true);

    const params = new URLSearchParams();
    params.append("page", page.toString());
    params.append("limit", "50");
    
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.linkId) params.append("linkId", filters.linkId);
    if (filters.country) params.append("country", filters.country);

    fetch(`/api/admin/estadisticas/referrals?${params.toString()}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setVisits(data.visits || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        setLoading(false);
      });
  }

  function handleFilterChange(key: string, value: string) {
    setFilters({ ...filters, [key]: value });
    setPage(1);
  }

  return (
    <div className="card" style={{ padding: "1.5rem" }}>
      <h3 style={{ marginTop: 0, marginBottom: "1rem" }}>Lista de Referencias</h3>
      
      {/* Filtros */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>Fecha Inicio</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => handleFilterChange("startDate", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>Fecha Fin</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange("endDate", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>Nombre del Link</label>
          <select
            value={filters.linkId}
            onChange={(e) => handleFilterChange("linkId", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
          >
            <option value="">Todos</option>
            {links.map((link) => (
              <option key={link.id} value={link.id}>{link.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem", fontWeight: 600 }}>País</label>
          <select
            value={filters.country}
            onChange={(e) => handleFilterChange("country", e.target.value)}
            style={{ width: "100%", padding: "0.5rem", borderRadius: "4px", border: "1px solid var(--border-color)" }}
          >
            <option value="all">Todos</option>
            <option value="">Sin país (N/A)</option>
            {countries.map((country) => (
              <option key={country} value={country}>{country}</option>
            ))}
          </select>
        </div>
        <div style={{ display: "flex", alignItems: "flex-end" }}>
          <button
            onClick={() => {
              setFilters({ startDate: "", endDate: "", linkId: "", country: "" });
              setPage(1);
            }}
            style={{ padding: "0.5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Tabla */}
      {loading ? (
        <div style={{ padding: "2rem", textAlign: "center" }}>Cargando referencias...</div>
      ) : visits.length > 0 ? (
        <>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f3f4f6" }}>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Fecha</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Nombre del Link</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Dirección IP</th>
                  <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>País</th>
                </tr>
              </thead>
              <tbody>
                {visits.map((visit) => (
                  <tr key={visit.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                      {new Date(visit.fecha).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "short" })}
                    </td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{visit.nombreLink}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem", fontFamily: "monospace" }}>{visit.direccionIP}</td>
                    <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{visit.pais}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                style={{ padding: "0.5rem 1rem", background: page === 1 ? "#e5e7eb" : "#3E3E3C", color: page === 1 ? "#9ca3af" : "#fff", border: "none", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer" }}
              >
                Anterior
              </button>
              <span style={{ padding: "0.5rem 1rem", display: "flex", alignItems: "center" }}>
                Página {page} de {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                style={{ padding: "0.5rem 1rem", background: page === totalPages ? "#e5e7eb" : "#3E3E3C", color: page === totalPages ? "#9ca3af" : "#fff", border: "none", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer" }}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      ) : (
        <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-tertiary)" }}>No hay referencias en el período seleccionado</div>
      )}
    </div>
  );
}

export default function EstadisticasPage() {
  return (
    <AuthGuard requiredRole={["CONTABLE", "MASTER"]}>
      <EstadisticasPageContent />
    </AuthGuard>
  );
}
