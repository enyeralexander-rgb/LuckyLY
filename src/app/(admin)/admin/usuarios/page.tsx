"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";
import { VENEZUELAN_BANKS, formatBankDisplay } from "../../../../lib/banks";

type User = {
  id: string;
  name: string;
  email: string;
  documentId: string;
  phoneNumber: string | null;
  nationalId: string | null;
  nationalIdType: string | null;
  bank: string | null;
  createdAt: string;
  suspended: boolean;
  suspendedReason: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function DatosUsuariosPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 });
  
  // Filtros
  const [searchName, setSearchName] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const [searchCedula, setSearchCedula] = useState("");
  const [searchTelefono, setSearchTelefono] = useState("");
  const [searchBanco, setSearchBanco] = useState("");
  const [searchFecha, setSearchFecha] = useState("");
  
  // Modal de suspensión
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendLoading, setSuspendLoading] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadUsers();
    }
  }, [auth, pagination.page]);

  function loadUsers() {
    if (!auth?.token) return;
    setLoading(true);
    
    const params = new URLSearchParams();
    params.append("page", pagination.page.toString());
    if (searchName) params.append("name", searchName);
    if (searchEmail) params.append("email", searchEmail);
    if (searchCedula) params.append("cedula", searchCedula);
    if (searchTelefono) params.append("telefono", searchTelefono);
    if (searchBanco) params.append("banco", searchBanco);
    if (searchFecha) params.append("fecha", searchFecha);

    fetch(`/api/admin/users?${params.toString()}`, { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setUsers([]);
          setLoading(false);
          return;
        }
        setUsers(Array.isArray(data.users) ? data.users : []);
        if (data.pagination) {
          setPagination(data.pagination);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar usuarios:", err);
        setUsers([]);
        setLoading(false);
      });
  }

  async function handleSuspendUser() {
    if (!auth?.token || !selectedUser) return;
    
    setSuspendLoading(true);
    try {
      const res = await fetch(`/api/admin/users/${selectedUser.id}/suspend`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          suspended: !selectedUser.suspended,
          reason: suspendReason
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert(data.message || "Operación exitosa");
        setShowSuspendModal(false);
        setSelectedUser(null);
        setSuspendReason("");
        loadUsers();
      } else {
        alert(data.error || "Error al procesar la solicitud");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar la solicitud");
    } finally {
      setSuspendLoading(false);
    }
  }

  function openSuspendModal(user: User) {
    setSelectedUser(user);
    setSuspendReason("");
    setShowSuspendModal(true);
  }

  function handleSearch() {
    setPagination({ ...pagination, page: 1 });
    setTimeout(() => loadUsers(), 100);
  }

  function handleClearFilters() {
    setSearchName("");
    setSearchEmail("");
    setSearchCedula("");
    setSearchTelefono("");
    setSearchBanco("");
    setSearchFecha("");
    setPagination({ ...pagination, page: 1 });
    setTimeout(() => loadUsers(), 100);
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  function renderPagination() {
    const pages: (number | string)[] = [];
    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    if (totalPages <= 1) return null;

    // Siempre mostrar primera página
    if (currentPage > 3) {
      pages.push(1);
      if (currentPage > 4) pages.push("...");
    }

    // Mostrar páginas alrededor de la actual
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, currentPage + 2);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Siempre mostrar última página
    if (currentPage < totalPages - 2) {
      if (currentPage < totalPages - 3) pages.push("...");
      pages.push(totalPages);
    }

    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: ".5rem", marginTop: "1.5rem", flexWrap: "wrap" }}>
        {pages.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} style={{ padding: ".5rem", color: "var(--text-secondary)" }}>
                ...
              </span>
            );
          }
          const pageNum = page as number;
          const isActive = pageNum === currentPage;
          return (
            <button
              key={pageNum}
              onClick={() => setPagination({ ...pagination, page: pageNum })}
              style={{
                padding: ".5rem .75rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: isActive ? "#85BB65" : "#F5F5E6",
                color: isActive ? "#fff" : "#3E3E3C",
                cursor: "pointer",
                fontWeight: isActive ? 700 : 400,
                minWidth: "40px"
              }}
            >
              {pageNum}
            </button>
          );
        })}
        {currentPage < totalPages && (
          <button
            onClick={() => setPagination({ ...pagination, page: currentPage + 1 })}
            style={{
              padding: ".5rem .75rem",
              borderRadius: "8px",
              border: "1px solid var(--border-color)",
              background: "var(--input-bg)",
              color: "var(--text-primary)",
              cursor: "pointer",
              fontWeight: 600
            }}
          >
            SIGUIENTE
          </button>
        )}
      </div>
    );
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Datos de Usuarios</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
          </div>
        </div>

        {/* Filtros de búsqueda */}
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <h3 style={{ margin: 0, fontSize: "1.125rem" }}>Filtros de Búsqueda</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Nombre:
              </label>
              <input
                type="text"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                placeholder="Buscar por nombre"
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Email:
              </label>
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Buscar por email"
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Cédula:
              </label>
              <input
                type="text"
                value={searchCedula}
                onChange={(e) => setSearchCedula(e.target.value)}
                placeholder="Buscar por cédula"
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Teléfono:
              </label>
              <input
                type="text"
                value={searchTelefono}
                onChange={(e) => setSearchTelefono(e.target.value)}
                placeholder="Buscar por teléfono"
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Banco:
              </label>
              <select
                value={searchBanco}
                onChange={(e) => setSearchBanco(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              >
                <option value="">Todos los bancos</option>
                {VENEZUELAN_BANKS.map((bank) => (
                  <option key={bank.code} value={bank.name}>
                    ({bank.code}) {bank.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: "var(--text-primary)" }}>
                Fecha de Registro:
              </label>
              <input
                type="date"
                value={searchFecha}
                onChange={(e) => setSearchFecha(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".5rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)"
                }}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: ".5rem", marginTop: ".5rem" }}>
            <button
              onClick={handleSearch}
              style={{
                padding: ".5rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "#85BB65",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 600
              }}
            >
              Buscar
            </button>
            <button
              onClick={handleClearFilters}
              style={{
                padding: ".5rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                cursor: "pointer"
              }}
            >
              Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Tabla de usuarios */}
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : users.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No se encontraron usuarios
          </div>
        ) : (
          <>
            <div className="card" style={{ overflowX: "auto" }}>
              <div style={{ padding: ".75rem", background: "var(--input-bg)", borderBottom: "1px solid #d4d4c4", fontSize: ".875rem", color: "var(--text-primary)" }}>
                Mostrando {users.length} de {pagination.total} usuarios (Página {pagination.page} de {pagination.totalPages})
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #d4d4c4", background: "var(--input-bg)" }}>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Nombre</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Email</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Documento</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Teléfono</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Banco</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Estado</th>
                    <th style={{ padding: ".75rem", textAlign: "left" }}>Registrado</th>
                    <th style={{ padding: ".75rem", textAlign: "center" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} style={{ borderBottom: "1px solid #d4d4c4", background: user.suspended ? "rgba(239, 68, 68, 0.1)" : "transparent" }}>
                      <td style={{ padding: ".75rem" }}>{user.name}</td>
                      <td style={{ padding: ".75rem" }}>{user.email}</td>
                      <td style={{ padding: ".75rem" }}>{user.documentId || "-"}</td>
                      <td style={{ padding: ".75rem" }}>{user.phoneNumber || "-"}</td>
                      <td style={{ padding: ".75rem" }}>{user.bank ? formatBankDisplay(user.bank) : "-"}</td>
                      <td style={{ padding: ".75rem" }}>
                        <span style={{
                          padding: ".25rem .5rem",
                          borderRadius: "4px",
                          fontSize: ".75rem",
                          fontWeight: 600,
                          background: user.suspended ? "rgba(239, 68, 68, 0.2)" : "rgba(133, 187, 101, 0.2)",
                          color: user.suspended ? "#ef4444" : "#85BB65"
                        }}>
                          {user.suspended ? "SUSPENDIDO" : "ACTIVO"}
                        </span>
                      </td>
                      <td style={{ padding: ".75rem" }}>{formatDate(user.createdAt)}</td>
                      <td style={{ padding: ".75rem", textAlign: "center" }}>
                        <button
                          onClick={() => openSuspendModal(user)}
                          style={{
                            padding: ".5rem 1rem",
                            borderRadius: "6px",
                            border: "none",
                            background: user.suspended ? "#85BB65" : "#ef4444",
                            color: user.suspended ? "#1a5c2e" : "#ffffff",
                            fontWeight: 600,
                            fontSize: ".75rem",
                            cursor: "pointer"
                          }}
                        >
                          {user.suspended ? "REACTIVAR" : "SUSPENDER"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {renderPagination()}
          </>
        )}

        {/* Modal de Suspensión */}
        {showSuspendModal && selectedUser && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000
          }}>
            <div style={{
              background: "var(--card-bg)",
              borderRadius: "12px",
              padding: "2rem",
              maxWidth: "500px",
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
            }}>
              <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>
                {selectedUser.suspended ? "Reactivar Usuario" : "Suspender Usuario"}
              </h2>
              
              <div style={{ marginBottom: "1.5rem" }}>
                <p style={{ margin: "0 0 .5rem", color: "var(--text-secondary)" }}>
                  <strong>Usuario:</strong> {selectedUser.name}
                </p>
                <p style={{ margin: 0, color: "var(--text-secondary)" }}>
                  <strong>Email:</strong> {selectedUser.email}
                </p>
              </div>

              {!selectedUser.suspended && (
                <div style={{ marginBottom: "1.5rem" }}>
                  <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Motivo de la suspensión *
                  </label>
                  <textarea
                    value={suspendReason}
                    onChange={(e) => setSuspendReason(e.target.value)}
                    placeholder="Ingrese el motivo de la suspensión..."
                    rows={3}
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "1rem",
                      resize: "vertical"
                    }}
                  />
                </div>
              )}

              {selectedUser.suspended && selectedUser.suspendedReason && (
                <div style={{ 
                  marginBottom: "1.5rem", 
                  padding: "1rem", 
                  background: "rgba(239, 68, 68, 0.1)", 
                  borderRadius: "8px" 
                }}>
                  <p style={{ margin: 0, color: "#ef4444", fontSize: ".875rem" }}>
                    <strong>Motivo actual:</strong> {selectedUser.suspendedReason}
                  </p>
                </div>
              )}

              <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
                <button
                  onClick={() => {
                    setShowSuspendModal(false);
                    setSelectedUser(null);
                    setSuspendReason("");
                  }}
                  style={{
                    padding: ".75rem 1.5rem",
                    borderRadius: "8px",
                    border: "1px solid var(--border-color)",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontWeight: 600,
                    cursor: "pointer"
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSuspendUser}
                  disabled={suspendLoading || (!selectedUser.suspended && !suspendReason.trim())}
                  style={{
                    padding: ".75rem 1.5rem",
                    borderRadius: "8px",
                    border: "none",
                    background: (!selectedUser.suspended && !suspendReason.trim()) || suspendLoading 
                      ? "#6b7280" 
                      : (selectedUser.suspended ? "#85BB65" : "#ef4444"),
                    color: "#ffffff",
                    fontWeight: 600,
                    cursor: (!selectedUser.suspended && !suspendReason.trim()) || suspendLoading 
                      ? "not-allowed" 
                      : "pointer"
                  }}
                >
                  {suspendLoading 
                    ? "Procesando..." 
                    : (selectedUser.suspended ? "Reactivar Usuario" : "Suspender Usuario")}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}

export default function DatosUsuariosPage() {
  return (
    <AuthGuard requiredRole={["SUPERADMIN", "MASTER"]}>
      <DatosUsuariosPageContent />
    </AuthGuard>
  );
}
