"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";

type ReferralLink = {
  id: string;
  code: string;
  name: string;
  clicks: number;
  registrations: number;
  purchases: number;
  revenue: number;
  createdAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  };
  visits: Array<{
    id: string;
    userId: string | null;
    user: {
      id: string;
      name: string;
      email: string;
    } | null;
    registered: boolean;
    purchased: boolean;
    createdAt: string;
  }>;
};

function ReferidosPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [links, setLinks] = useState<ReferralLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newLinkName, setNewLinkName] = useState("");
  const [creating, setCreating] = useState(false);
  const [selectedLink, setSelectedLink] = useState<ReferralLink | null>(null);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth?.token) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadLinks();
    }
  }, [auth]);

  function loadLinks() {
    if (!auth?.token) return;
    setLoading(true);
    fetch("/api/admin/referidos", { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => {
        if (!r.ok) {
          return r.json().then((data) => {
            throw new Error(data.error || "Error al cargar links");
          });
        }
        return r.json();
      })
      .then((data) => {
        setLinks(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error:", err);
        alert(err.message || "Error al cargar links");
        setLoading(false);
      });
  }

  async function handleCreateLink() {
    if (!auth?.token || !newLinkName.trim()) {
      alert("El nombre del link es requerido");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch("/api/admin/referidos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name: newLinkName.trim() })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al crear link");
      }
      setNewLinkName("");
      setShowCreateForm(false);
      loadLinks();
    } catch (err: any) {
      alert(err.message || "Error al crear link");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteLink(id: string) {
    if (!auth?.token || !confirm("¿Estás seguro de eliminar este link de referido?")) return;
    try {
      const res = await fetch(`/api/admin/referidos/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al eliminar link");
      }
      loadLinks();
    } catch (err: any) {
      alert(err.message || "Error al eliminar link");
    }
  }

  function copyToClipboard(text: string) {
    const fullUrl = `${window.location.origin}/api/public/referral/${text}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      alert("Link copiado al portapapeles");
    });
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("es-VE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "#3E3E3C" }}>Referidos</h1>
          <button
            className="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            style={{ padding: "0.75rem 1.5rem" }}
          >
            {showCreateForm ? "Cancelar" : "+ Crear Nuevo Link"}
          </button>
        </div>

        {showCreateForm && (
          <div className="card" style={{ marginBottom: "2rem", padding: "1.5rem" }}>
            <h3 style={{ marginTop: 0 }}>Crear Nuevo Link de Referido</h3>
            <div style={{ display: "flex", gap: "1rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Nombre del Link</label>
                <input
                  type="text"
                  value={newLinkName}
                  onChange={(e) => setNewLinkName(e.target.value)}
                  placeholder="Ej: Campaña Facebook"
                  style={{ width: "100%", padding: "0.75rem" }}
                />
              </div>
              <button
                className="button"
                onClick={handleCreateLink}
                disabled={creating || !newLinkName.trim()}
                style={{ padding: "0.75rem 1.5rem" }}
              >
                {creating ? "Creando..." : "Crear"}
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando links...</div>
        ) : links.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>No hay links de referidos creados</div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {links.map((link) => (
              <div key={link.id} className="card" style={{ padding: "1.5rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                  <div>
                    <h3 style={{ margin: 0, marginBottom: "0.5rem" }}>{link.name}</h3>
                    <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
                      Creado por: {link.createdBy.name} ({link.createdBy.email})
                    </p>
                    <p style={{ margin: "0.25rem 0 0", color: "#6b7280", fontSize: "0.875rem" }}>
                      Creado el: {formatDate(link.createdAt)}
                    </p>
                  </div>
                  <button
                    className="button"
                    onClick={() => handleDeleteLink(link.id)}
                    style={{ padding: "0.5rem 1rem", background: "#dc2626", color: "#fff" }}
                  >
                    Eliminar
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
                  <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Clicks</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3E3E3C" }}>{link.clicks}</div>
                  </div>
                  <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Registros</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3E3E3C" }}>{link.registrations}</div>
                  </div>
                  <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Compras</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#3E3E3C" }}>{link.purchases}</div>
                  </div>
                  <div style={{ padding: "1rem", background: "#f3f4f6", borderRadius: "8px" }}>
                    <div style={{ fontSize: "0.875rem", color: "#6b7280", marginBottom: "0.25rem" }}>Ingresos</div>
                    <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#85BB65" }}>
                      {Number(link.revenue).toFixed(2)} Bs.
                    </div>
                  </div>
                </div>

                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: 600 }}>Link de Referido</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <input
                      type="text"
                      value={`${window.location.origin}/api/public/referral/${link.code}`}
                      readOnly
                      style={{ flex: 1, padding: "0.75rem", background: "#f3f4f6" }}
                    />
                    <button
                      className="button"
                      onClick={() => copyToClipboard(link.code)}
                      style={{ padding: "0.75rem 1rem" }}
                    >
                      Copiar
                    </button>
                  </div>
                </div>

                <button
                  className="button"
                  onClick={() => setSelectedLink(selectedLink?.id === link.id ? null : link)}
                  style={{ width: "100%", padding: "0.75rem" }}
                >
                  {selectedLink?.id === link.id ? "Ocultar Detalles" : "Ver Detalles"}
                </button>

                {selectedLink?.id === link.id && (
                  <div style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid #e5e7eb" }}>
                    <h4 style={{ marginBottom: "1rem" }}>Historial de Visitas</h4>
                    {link.visits.length === 0 ? (
                      <p style={{ color: "#6b7280" }}>No hay visitas registradas</p>
                    ) : (
                      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ background: "#f3f4f6" }}>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Fecha</th>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Usuario</th>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Registrado</th>
                              <th style={{ padding: "0.75rem", textAlign: "left", fontSize: "0.875rem", fontWeight: 600 }}>Compró</th>
                            </tr>
                          </thead>
                          <tbody>
                            {link.visits.map((visit) => (
                              <tr key={visit.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{formatDate(visit.createdAt)}</td>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                                  {visit.user ? `${visit.user.name} (${visit.user.email})` : "Visitante"}
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                                  {visit.registered ? "✓ Sí" : "✗ No"}
                                </td>
                                <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>
                                  {visit.purchased ? "✓ Sí" : "✗ No"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function ReferidosPage() {
  return (
    <AuthGuard requiredRole={["SUPERADMIN", "MASTER"]}>
      <ReferidosPageContent />
    </AuthGuard>
  );
}
