"use client";
// Importaciones usando rutas relativas para compatibilidad con Vercel
import { AdminNavBar } from "../../../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../../../lib/clientAuth";
import { useParams, useRouter } from "next/navigation";

type Admin = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  role: string;
  suspended: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

function ModificarAdminPageContent() {
  const params = useParams();
  const router = useRouter();
  const adminId = params.id as string;
  const [auth, setAuth] = useState<any>(null);
  const [admin, setAdmin] = useState<Admin | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    username: "",
    role: "AGENT" as "AGENT" | "SUPERADMIN" | "CONTABLE" | "MASTER",
    password: ""
  });

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth?.token) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token && adminId) {
      loadAdmin();
    }
  }, [auth, adminId]);

  function loadAdmin() {
    if (!auth?.token || !adminId) return;
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
          alert(`Error: ${data.error}`);
          router.push("/admin/roles/admins");
          return;
        }
        const admins = Array.isArray(data) ? data : [];
        const foundAdmin = admins.find((a: Admin) => a.id === adminId);
        if (!foundAdmin) {
          alert("Administrador no encontrado");
          router.push("/admin/roles/admins");
          return;
        }
        setAdmin(foundAdmin);
        setFormData({
          name: foundAdmin.name,
          email: foundAdmin.email,
          username: foundAdmin.username || "",
          role: foundAdmin.role as "AGENT" | "SUPERADMIN",
          password: ""
        });
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar administrador:", err);
        alert(`Error: ${err.message || "No se pudo cargar el administrador"}`);
        router.push("/admin/roles/admins");
      });
  }

  async function handleSave() {
    if (!auth?.token || !admin) return;

    if (!formData.name || !formData.email || !formData.role) {
      alert("Completa todos los campos obligatorios");
      return;
    }

    setSaving(true);
    try {
      const body: any = {
        name: formData.name,
        email: formData.email,
        role: formData.role
      };

      if (formData.username) {
        body.username = formData.username;
      }

      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(`/api/admin/roles/admins/${admin.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok) {
        alert("Administrador actualizado exitosamente");
        router.push("/admin/roles/admins");
      } else {
        alert(`Error: ${data.error || "No se pudo actualizar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
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

  if (loading) {
    return (
      <>
        <AdminNavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "900px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0 }}>Modificar Administrador</h1>
          <button
            onClick={() => router.push("/admin/roles/admins")}
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

        {/* Información del Administrador */}
        <div className="card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem" }}>Información de la Cuenta</h2>
          <div style={{ display: "grid", gap: ".75rem" }}>
            <div>
              <strong style={{ color: var(--text-primary) }}>ID:</strong> {admin.id}
            </div>
            <div>
              <strong style={{ color: var(--text-primary) }}>Estado:</strong>{" "}
              <span
                style={{
                  padding: ".25rem .5rem",
                  borderRadius: "4px",
                  background: admin.suspended ? "#dc2626" : "#85BB65",
                  color: "#fff",
                  fontSize: ".875rem",
                  fontWeight: 600
                }}
              >
                {admin.suspended ? "SUSPENDIDO" : "ACTIVO"}
              </span>
            </div>
            <div>
              <strong style={{ color: var(--text-primary) }}>Rol Actual:</strong>{" "}
              <span
                style={{
                  padding: ".25rem .5rem",
                  borderRadius: "4px",
                  background: getRoleColor(admin.role),
                  color: "#fff",
                  fontSize: ".875rem",
                  fontWeight: 600
                }}
              >
                {getRoleLabel(admin.role)}
              </span>
            </div>
            <div>
              <strong style={{ color: var(--text-primary) }}>Fecha de Creación:</strong> {formatDate(admin.createdAt)}
            </div>
            {admin.createdBy && (
              <div>
                <strong style={{ color: var(--text-primary) }}>Creado por:</strong> {admin.createdBy.name} ({admin.createdBy.email})
              </div>
            )}
            <div>
              <strong style={{ color: var(--text-primary) }}>Última Actualización:</strong> {formatDate(admin.updatedAt)}
            </div>
          </div>
        </div>

        {/* Formulario de Modificación */}
        <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
          <h2 style={{ margin: 0 }}>Modificar Datos</h2>
          <div>
            <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
              Nombre completo *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: "100%",
                padding: ".75rem",
                borderRadius: "8px",
                border: 1px solid var(--border-color),
                background: var(--input-bg),
                color: var(--text-primary)
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: "100%",
                padding: ".75rem",
                borderRadius: "8px",
                border: 1px solid var(--border-color),
                background: var(--input-bg),
                color: var(--text-primary)
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
              Nombre de usuario (opcional)
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              style={{
                width: "100%",
                padding: ".75rem",
                borderRadius: "8px",
                border: 1px solid var(--border-color),
                background: var(--input-bg),
                color: var(--text-primary)
              }}
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
              Rol *
            </label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as "AGENT" | "SUPERADMIN" | "CONTABLE" | "MASTER" })}
              style={{
                width: "100%",
                padding: ".75rem",
                borderRadius: "8px",
                border: 1px solid var(--border-color),
                background: var(--input-bg),
                color: var(--text-primary),
                cursor: "pointer"
              }}
            >
              <option value="AGENT">Agente</option>
              <option value="SUPERADMIN">Super Administrador</option>
              <option value="CONTABLE">Contable</option>
              <option value="MASTER">Master</option>
            </select>
          </div>
          <div>
            <label style={{ display: "block", marginBottom: ".5rem", fontSize: ".875rem", fontWeight: 600, color: var(--text-primary) }}>
              Nueva contraseña (dejar vacío para no cambiar)
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Dejar vacío para mantener la contraseña actual"
              style={{
                width: "100%",
                padding: ".75rem",
                borderRadius: "8px",
                border: 1px solid var(--border-color),
                background: var(--input-bg),
                color: var(--text-primary)
              }}
            />
          </div>
          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: ".75rem 1.5rem",
                background: saving ? "#6b7280" : "#85BB65",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: saving ? "not-allowed" : "pointer",
                fontWeight: 700
              }}
            >
              {saving ? "Guardando..." : "Guardar Cambios"}
            </button>
            <button
              onClick={() => router.push("/admin/roles/admins")}
              style={{
                padding: ".75rem 1.5rem",
                background: "#94a3b8",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer"
              }}
            >
              Cancelar
            </button>
          </div>
        </div>
      </main>
    </>
  );
}

export default function ModificarAdminPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <ModificarAdminPageContent />
    </AuthGuard>
  );
}
