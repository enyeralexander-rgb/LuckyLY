"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

type Log = {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  createdAt: string;
  ip: string | null;
  actor: {
    id: string;
    name: string;
    email: string;
    role: string;
  } | null;
  meta: any;
};

type Admin = {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
};

type AdminWithStats = Admin & {
  totalActions: number;
  lastActivity: string | null;
};

function LogsAdminsPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [adminsWithStats, setAdminsWithStats] = useState<AdminWithStats[]>([]);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [selectedAdmin, setSelectedAdmin] = useState<AdminWithStats | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "details">("list");

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth?.token) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadAdmins();
    }
  }, [auth]);

  useEffect(() => {
    if (auth?.token && selectedAdmin) {
      loadAdminLogs(selectedAdmin.id);
    }
  }, [auth, selectedAdmin, dateFilter]);

  function loadAdmins() {
    if (!auth?.token) return;
    setLoading(true);
    fetch("/api/admin/roles/admins", { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((data) => {
            throw new Error(data.error || "Error al obtener administradores");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setAdmins([]);
          setLoading(false);
        } else {
          const adminsList = Array.isArray(data) ? data : [];
          setAdmins(adminsList);
          loadAdminsWithStats(adminsList);
        }
      })
      .catch((err) => {
        console.error("Error al cargar administradores:", err);
        setAdmins([]);
        setLoading(false);
      });
  }

  async function loadAdminsWithStats(adminsList: Admin[]) {
    if (!auth?.token) return;
    
    try {
      const statsPromises = adminsList.map(async (admin) => {
        const params = new URLSearchParams();
        params.append("adminId", admin.id);
        const response = await fetch(`/api/admin/logs/admins?${params.toString()}`, {
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (response.ok) {
          const logsData = await response.json();
          const adminLogs = Array.isArray(logsData) ? logsData : [];
          const lastLog = adminLogs.length > 0 ? adminLogs[0] : null;
          return {
            ...admin,
            totalActions: adminLogs.length,
            lastActivity: lastLog?.createdAt || null
          };
        }
        return {
          ...admin,
          totalActions: 0,
          lastActivity: null
        };
      });

      const stats = await Promise.all(statsPromises);
      setAdminsWithStats(stats);
      setLoading(false);
    } catch (err) {
      console.error("Error al cargar estadísticas:", err);
      setAdminsWithStats(adminsList.map(a => ({ ...a, totalActions: 0, lastActivity: null })));
      setLoading(false);
    }
  }

  function loadAdminLogs(adminId: string) {
    if (!auth?.token) return;
    const params = new URLSearchParams();
    params.append("adminId", adminId);
    if (dateFilter) {
      params.append("date", dateFilter);
    }

    fetch(`/api/admin/logs/admins?${params.toString()}`, {
      headers: { Authorization: `Bearer ${auth.token}` }
    })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((data) => {
            throw new Error(data.error || "Error al obtener logs");
          });
        }
        return r.json();
      })
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        } else {
          setLogs([]);
        }
      })
      .catch((err) => {
        console.error("Error al cargar logs:", err);
        setLogs([]);
      });
  }

  function handleViewDetails(admin: AdminWithStats) {
    setSelectedAdmin(admin);
    setViewMode("details");
  }

  function handleBackToList() {
    setSelectedAdmin(null);
    setViewMode("list");
    setLogs([]);
  }

  function getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      AGENT: "Agente",
      SUPERADMIN: "Super Administrador",
      MASTER: "Administrador Maestro"
    };
    return labels[role] || role;
  }

  function getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      AGENT: "#3b82f6",
      SUPERADMIN: "#8b5cf6",
      MASTER: "#dc2626"
    };
    return colors[role] || "#94a3b8";
  }

  function getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      LOGIN: "Inicio de sesión",
      CREATE_RAFFLE: "Sorteo creado",
      EXECUTE_RAFFLE: "Sorteo ejecutado",
      CONFIRM_SLOT: "Cupo confirmado",
      CONFIRM_PENDING_SLOT: "Cupo confirmado",
      REJECT_SLOT: "Cupo rechazado",
      REJECT_PENDING_SLOT: "Cupo rechazado",
      PAY_PRIZE: "Premio pagado",
      MARK_CLAIM_PAID: "Premio pagado",
      REJECT_CLAIM: "Reclamo rechazado",
      CREATE_AGENT: "Agente creado",
      CREATE_SUPERADMIN: "Superadmin creado",
      UPDATE_ADMIN: "Administrador modificado",
      DELETE_ADMIN: "Administrador eliminado",
      SUSPEND_ADMIN: "Administrador suspendido",
      REACTIVATE_ADMIN: "Administrador reactivado",
      UPDATE_RULES: "Reglas actualizadas",
      UPDATE_TERMS: "Términos actualizados",
      UPDATE_PAYMENT_MOBILE: "Pago móvil actualizado",
      UPDATE_SOCIAL_MEDIA: "Redes sociales actualizadas"
    };
    return labels[action] || action;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }

  function formatMetaData(meta: any, action: string): JSX.Element {
    if (!meta || typeof meta !== "object") {
      return <span style={{ color: var(--text-secondary) }}>Sin detalles adicionales</span>;
    }

    const elements: JSX.Element[] = [];

    // Información general
    if (meta.title) {
      elements.push(
        <div key="title" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Título:</strong> {String(meta.title)}
        </div>
      );
    }

    if (meta.description) {
      elements.push(
        <div key="description" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Descripción:</strong> {String(meta.description)}
        </div>
      );
    }

    // Información de sorteos
    if (meta.type) {
      elements.push(
        <div key="type" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Tipo de Ruleta:</strong> {String(meta.type)}
        </div>
      );
    }

    if (meta.pricePerSlot) {
      elements.push(
        <div key="price" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Precio por Cupo:</strong> {String(meta.pricePerSlot)} Bs.
        </div>
      );
    }

    if (meta.slots) {
      elements.push(
        <div key="slots" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Total de Cupos:</strong> {String(meta.slots)}
        </div>
      );
    }

    if (meta.winnersCount) {
      elements.push(
        <div key="winners" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Ganadores:</strong> {String(meta.winnersCount)}
        </div>
      );
    }

    if (meta.prizes) {
      elements.push(
        <div key="prizes" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Premios:</strong>
          <ul style={{ margin: ".25rem 0 0 1.5rem", padding: 0 }}>
            {(Array.isArray(meta.prizes) ? meta.prizes : []).map((prize: string, idx: number) => (
              <li key={idx}>{prize}</li>
            ))}
          </ul>
        </div>
      );
    }

    // Información de ganadores
    if (meta.winner) {
      elements.push(
        <div key="winner" style={{ marginBottom: ".5rem", padding: ".5rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "4px" }}>
          <strong style={{ color: var(--color-primary) }}>Ganador:</strong> {String(meta.winner)}
        </div>
      );
    }

    if (meta.winners) {
      elements.push(
        <div key="winners" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Ganadores:</strong>
          <ul style={{ margin: ".25rem 0 0 1.5rem", padding: 0 }}>
            {(Array.isArray(meta.winners) ? meta.winners : []).map((winner: string, idx: number) => (
              <li key={idx}>{winner}</li>
            ))}
          </ul>
        </div>
      );
    }

    // Información de cupos
    if (meta.raffleTitle) {
      elements.push(
        <div key="raffleTitle" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Sorteo:</strong> {String(meta.raffleTitle)}
        </div>
      );
    }

    if (meta.value) {
      elements.push(
        <div key="value" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Cupo:</strong> {String(meta.value)}
        </div>
      );
    }

    if (meta.userName) {
      elements.push(
        <div key="userName" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Usuario:</strong> {String(meta.userName)} ({String(meta.userEmail || "N/A")})
        </div>
      );
    }

    if (meta.paymentMobileRef) {
      elements.push(
        <div key="paymentRef" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Referencia de Pago:</strong> {String(meta.paymentMobileRef)}
        </div>
      );
    }

    // Información de administradores
    if (meta.email) {
      elements.push(
        <div key="email" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Email:</strong> {String(meta.email)}
        </div>
      );
    }

    if (meta.username) {
      elements.push(
        <div key="username" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Usuario:</strong> {String(meta.username)}
        </div>
      );
    }

    if (meta.previousRole || meta.newRole) {
      elements.push(
        <div key="roleChange" style={{ marginBottom: ".5rem", padding: ".5rem", background: "rgba(59, 130, 246, 0.1)", borderRadius: "4px" }}>
          <strong style={{ color: "#3b82f6" }}>Cambio de Rol:</strong>
          {meta.previousRole && <div>Anterior: {getRoleLabel(String(meta.previousRole))}</div>}
          {meta.newRole && <div>Nuevo: {getRoleLabel(String(meta.newRole))}</div>}
        </div>
      );
    }

    if (meta.changes) {
      elements.push(
        <div key="changes" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Campos Modificados:</strong>
          <ul style={{ margin: ".25rem 0 0 1.5rem", padding: 0 }}>
            {(Array.isArray(meta.changes) ? meta.changes : []).map((change: string, idx: number) => (
              <li key={idx}>{change}</li>
            ))}
          </ul>
        </div>
      );
    }

    // Información de pagos
    if (meta.paymentRef) {
      elements.push(
        <div key="paymentRef" style={{ marginBottom: ".5rem", padding: ".5rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "4px" }}>
          <strong style={{ color: "#f59e0b" }}>Referencia de Pago:</strong> {String(meta.paymentRef)}
        </div>
      );
    }

    // Fechas
    if (meta.startsAt) {
      elements.push(
        <div key="startsAt" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Fecha de Inicio:</strong> {formatDate(String(meta.startsAt))}
        </div>
      );
    }

    if (meta.executedAt) {
      elements.push(
        <div key="executedAt" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Fecha de Ejecución:</strong> {formatDate(String(meta.executedAt))}
        </div>
      );
    }

    // Acción
    if (meta.action) {
      elements.push(
        <div key="action" style={{ marginBottom: ".5rem" }}>
          <strong style={{ color: var(--text-primary) }}>Acción Realizada:</strong> {String(meta.action)}
        </div>
      );
    }

    // Otros campos
    Object.keys(meta).forEach((key) => {
      if (!["title", "description", "type", "pricePerSlot", "slots", "winnersCount", "prizes", "winner", "winners", "raffleTitle", "value", "userName", "userEmail", "paymentMobileRef", "email", "username", "previousRole", "newRole", "changes", "paymentRef", "startsAt", "executedAt", "action"].includes(key)) {
        const value = meta[key];
        if (value !== null && value !== undefined) {
          elements.push(
            <div key={key} style={{ marginBottom: ".5rem" }}>
              <strong style={{ color: var(--text-primary) }}>{key}:</strong> {String(value)}
            </div>
          );
        }
      }
    });

    return <div style={{ display: "grid", gap: ".5rem" }}>{elements}</div>;
  }

  // Vista de lista de administradores
  if (viewMode === "list") {
    const filteredAdmins = roleFilter === "ALL" 
      ? adminsWithStats 
      : adminsWithStats.filter(a => a.role === roleFilter);

    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <h1 style={{ marginBottom: "1.5rem" }}>Logs de Administradores</h1>

          <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
                Filtrar por Rol:
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: 1px solid var(--border-color),
                  background: var(--input-bg),
                  color: var(--text-primary),
                  cursor: "pointer"
                }}
              >
                <option value="ALL">Todos los roles</option>
                <option value="AGENT">Agentes</option>
                <option value="SUPERADMIN">Super Administradores</option>
                <option value="MASTER">Administradores Maestros</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
          ) : filteredAdmins.length === 0 ? (
            <div className="card" style={{ padding: "2rem", textAlign: "center", color: var(--text-secondary) }}>
              No hay administradores registrados
            </div>
          ) : (
            <div className="card" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #d4d4c4", background: var(--input-bg) }}>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>ADMINISTRADOR</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>NOMBRE</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>ROL</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>ACCIONES</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>ÚLTIMA ACTIVIDAD</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>DETALLES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} style={{ borderBottom: "1px solid #d4d4c4" }}>
                      <td style={{ padding: ".75rem" }}>
                        <div style={{ fontWeight: 600 }}>{admin.name}</div>
                        <div style={{ fontSize: ".75rem", color: var(--text-secondary) }}>{admin.email}</div>
                      </td>
                      <td style={{ padding: ".75rem" }}>{admin.name}</td>
                      <td style={{ padding: ".75rem" }}>
                        <span
                          style={{
                            padding: ".25rem .5rem",
                            borderRadius: "4px",
                            background: getRoleColor(admin.role),
                            color: "#fff",
                            fontSize: ".75rem",
                            fontWeight: 600
                          }}
                        >
                          {getRoleLabel(admin.role)}
                        </span>
                      </td>
                      <td style={{ padding: ".75rem" }}>{admin.totalActions}</td>
                      <td style={{ padding: ".75rem", fontSize: ".875rem" }}>
                        {admin.lastActivity ? formatDate(admin.lastActivity) : "N/A"}
                      </td>
                      <td style={{ padding: ".75rem" }}>
                        <button
                          onClick={() => handleViewDetails(admin)}
                          style={{
                            padding: ".5rem 1rem",
                            background: "#3b82f6",
                            color: "#fff",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontWeight: 600
                          }}
                        >
                          Ver Detalles
                        </button>
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

  // Vista de detalles del administrador
  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0 }}>Detalles del Administrador</h1>
          <button
            onClick={handleBackToList}
            style={{
              padding: ".5rem 1rem",
              background: "#94a3b8",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            ← Volver a la Lista
          </button>
        </div>

        {selectedAdmin && (
          <>
            <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1rem" }}>Información del Administrador</h2>
              <div style={{ display: "grid", gap: ".75rem" }}>
                <div>
                  <strong style={{ color: var(--text-primary) }}>Status:</strong>{" "}
                  <span style={{ color: var(--color-primary), fontWeight: 600 }}>Activo</span>
                </div>
                <div>
                  <strong style={{ color: var(--text-primary) }}>Administrador:</strong> {selectedAdmin.email}
                </div>
                <div>
                  <strong style={{ color: var(--text-primary) }}>Rol:</strong>{" "}
                  <span
                    style={{
                      padding: ".25rem .5rem",
                      borderRadius: "4px",
                      background: getRoleColor(selectedAdmin.role),
                      color: "#fff",
                      fontSize: ".875rem",
                      fontWeight: 600
                    }}
                  >
                    {getRoleLabel(selectedAdmin.role)}
                  </span>
                </div>
                <div>
                  <strong style={{ color: var(--text-primary) }}>Nombre del administrador:</strong> {selectedAdmin.name}
                </div>
                <div>
                  <strong style={{ color: var(--text-primary) }}>Total de Acciones:</strong> {selectedAdmin.totalActions}
                </div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: "1.5rem", padding: "1rem" }}>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
                Filtrar por Fecha:
              </label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  width: "100%",
                  maxWidth: "300px",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: 1px solid var(--border-color),
                  background: var(--input-bg),
                  color: var(--text-primary)
                }}
              />
              {dateFilter && (
                <button
                  onClick={() => setDateFilter("")}
                  style={{
                    marginLeft: ".5rem",
                    padding: ".5rem 1rem",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "4px",
                    cursor: "pointer"
                  }}
                >
                  Limpiar Filtro
                </button>
              )}
            </div>

            <div style={{ display: "grid", gap: "1rem" }}>
              <h3 style={{ margin: 0 }}>Acciones Realizadas</h3>
              {logs.length === 0 ? (
                <div className="card" style={{ padding: "2rem", textAlign: "center", color: var(--text-secondary) }}>
                  No hay acciones registradas{dateFilter ? " para la fecha seleccionada" : ""}
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="card" style={{ padding: "1.5rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem", flexWrap: "wrap", gap: "1rem" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                          <span
                            style={{
                              padding: ".25rem .5rem",
                              borderRadius: "4px",
                              background: "#3b82f6",
                              color: "#fff",
                              fontSize: ".75rem",
                              fontWeight: 600
                            }}
                          >
                            {getActionLabel(log.action)}
                          </span>
                          <span style={{ fontSize: ".875rem", color: var(--text-secondary) }}>
                            {formatDate(log.createdAt)}
                          </span>
                        </div>
                        <div style={{ fontSize: ".875rem", color: var(--text-secondary) }}>
                          {log.entity} {log.entityId ? `#${log.entityId}` : ""}
                        </div>
                      </div>
                      {log.ip && (
                        <div style={{ fontSize: ".875rem", color: var(--text-secondary) }}>
                          <strong>IP:</strong> {log.ip}
                        </div>
                      )}
                    </div>
                    <div style={{ padding: "1rem", background: var(--input-bg), borderRadius: "8px", border: 1px solid var(--border-color) }}>
                      <strong style={{ color: var(--text-primary), display: "block", marginBottom: ".5rem" }}>Detalles:</strong>
                      {formatMetaData(log.meta, log.action)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </main>
    </>
  );
}

export default function LogsAdminsPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <LogsAdminsPageContent />
    </AuthGuard>
  );
}
