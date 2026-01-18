"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";

type Superadmin = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  role: string;
};

function GestionarSuperadminsPageContent() {
  const auth = getStoredAuth();
  const [superadmins, setSuperadmins] = useState<Superadmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", password: "" });

  useEffect(() => {
    if (auth?.token) {
      fetch("/api/admin/roles/superadmins", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          setSuperadmins(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  async function handleCreate() {
    if (!auth?.token) return;
    try {
      const res = await fetch("/api/admin/roles/superadmins", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        alert("Superadmin creado exitosamente");
        setShowForm(false);
        setFormData({ name: "", email: "", password: "" });
        window.location.reload();
      } else {
        const err = await res.json();
        alert(`Error: ${err.error || "No se pudo crear el superadmin"}`);
      }
    } catch {
      alert("Error al crear superadmin");
    }
  }

  async function handleDelete(superadminId: string) {
    if (!auth?.token || !confirm("¿Borrar definitivamente este superadmin? Esta acción no se puede deshacer.")) return;
    try {
      const res = await fetch(`/api/admin/roles/superadmins/${superadminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        alert("Superadmin borrado");
        window.location.reload();
      } else {
        alert("Error al borrar");
      }
    } catch {
      alert("Error al borrar");
    }
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0 }}>Gestionar Superadministradores</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            style={{
              padding: ".5rem 1rem",
              background: "#85BB65",
              color: "#fff",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: 700
            }}
          >
            {showForm ? "Cancelar" : "+ Crear Superadmin"}
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: "1.5rem", display: "grid", gap: "1rem" }}>
            <h3 style={{ margin: 0 }}>Crear Nuevo Superadmin</h3>
            <input
              type="text"
              placeholder="Nombre completo"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
            />
            <button
              onClick={handleCreate}
              style={{
                padding: ".75rem 1.5rem",
                background: "#85BB65",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: 700
              }}
            >
              Crear Superadmin
            </button>
          </div>
        )}

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : superadmins.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>No hay superadmins registrados</div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {superadmins.map((superadmin) => (
              <div key={superadmin.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ margin: 0 }}>{superadmin.name}</h3>
                  <p style={{ margin: ".25rem 0", color: "var(--text-secondary)" }}>{superadmin.email}</p>
                  <p style={{ margin: ".25rem 0", color: "var(--text-secondary)", fontSize: ".875rem" }}>
                    Creado: {new Date(superadmin.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(superadmin.id)}
                  style={{
                    padding: ".5rem 1rem",
                    background: "#dc2626",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    cursor: "pointer"
                  }}
                >
                  Borrar
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function GestionarSuperadminsPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <GestionarSuperadminsPageContent />
    </AuthGuard>
  );
}
