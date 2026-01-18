"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import { useRouter } from "next/navigation";

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

function GestionarAdminsPageContent() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formData, setFormData] = useState({ 
    firstName: "", 
    lastName: "",
    documentId: "",
    email: "", 
    password: "",
    role: "AGENT" as "AGENT" | "SUPERADMIN" | "CONTABLE" | "MASTER"
  });

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
  }, [auth, roleFilter]);

  function loadAdmins() {
    if (!auth?.token) return;
    setLoading(true);
    const url = roleFilter === "ALL" 
      ? "/api/admin/roles/admins"
      : `/api/admin/roles/admins?role=${roleFilter}`;
    
    fetch(url, { headers: { Authorization: `Bearer ${auth.token}` } })
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
          setAdmins([]);
        } else {
          setAdmins(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar administradores:", err);
        alert(`Error: ${err.message || "No se pudieron cargar los administradores"}`);
        setAdmins([]);
        setLoading(false);
      });
  }

  function resetForm() {
    setFormData({ firstName: "", lastName: "", documentId: "", email: "", password: "", role: "AGENT" as "AGENT" | "SUPERADMIN" | "CONTABLE" | "MASTER" });
    setShowForm(false);
    setEditingId(null);
    setEmailError("");
    setPasswordError("");
    setShowPassword(false);
  }

  // Validar contraseña: mínimo 5 caracteres alfanuméricos + 1 caracter especial
  function validatePassword(password: string): boolean {
    const hasMinLength = password.length >= 6;
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasAlphanumeric = /[a-zA-Z0-9]{5,}/.test(password.replace(/[^a-zA-Z0-9]/g, ""));
    return hasMinLength && hasSpecialChar && hasAlphanumeric;
  }

  // Verificar disponibilidad de email
  async function checkEmailAvailability(email: string) {
    if (!email || !email.includes("@")) {
      setEmailError("Ingresa un email válido");
      return;
    }
    try {
      const res = await fetch(`/api/auth/check-availability?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.emailTaken) {
        setEmailError("Este correo ya está registrado");
      } else {
        setEmailError("");
      }
    } catch {
      setEmailError("");
    }
  }

  function startEdit(admin: Admin) {
    router.push(`/admin/roles/admins/${admin.id}/modificar`);
  }

  async function handleSuspend(admin: Admin) {
    if (!auth?.token || !confirm(`¿${admin.suspended ? "Reactivar" : "Suspender"} a ${admin.name}?`)) return;
    
    try {
      const res = await fetch(`/api/admin/roles/admins/${admin.id}/suspend`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert(data.message || (admin.suspended ? "Administrador reactivado" : "Administrador suspendido"));
        loadAdmins();
      } else {
        const actionText = admin.suspended ? "reactivar" : "suspender";
        alert(`Error: ${data.error || `No se pudo ${actionText}`}`);
      }
    } catch (err) {
      console.error("Error:", err);
      const actionText = admin.suspended ? "reactivar" : "suspender";
      alert(`Error al ${actionText} administrador`);
    }
  }

  async function handleSave() {
    if (!auth?.token) return;
    
    if (!formData.firstName || !formData.lastName || !formData.documentId || !formData.email || !formData.role) {
      alert("Completa todos los campos obligatorios: Nombres, Apellido, Cédula, Correo y Rol");
      return;
    }

    if (!editingId && !formData.password) {
      alert("La contraseña es obligatoria al crear un administrador");
      return;
    }

    if (!editingId && !validatePassword(formData.password)) {
      setPasswordError("La contraseña debe tener al menos 5 caracteres alfanuméricos y 1 caracter especial");
      return;
    }

    if (emailError) {
      alert("El correo ya está registrado. Por favor, usa otro correo.");
      return;
    }

    try {
      const url = editingId 
        ? `/api/admin/roles/admins/${editingId}`
        : "/api/admin/roles/admins";
      
      const method = editingId ? "PUT" : "POST";
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const body: any = {
        name: fullName,
        email: formData.email,
        documentId: formData.documentId,
        role: formData.role
      };

      if (formData.password) {
        body.password = formData.password;
      }

      const res = await fetch(url, {
        method,
        headers: { 
          "Content-Type": "application/json", 
          Authorization: `Bearer ${auth.token}` 
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      
      if (res.ok) {
        alert(editingId ? "Administrador actualizado exitosamente" : "Administrador creado exitosamente");
        resetForm();
        loadAdmins();
      } else {
        alert(`Error: ${data.error || "No se pudo guardar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al guardar");
    }
  }

  async function handleDelete(adminId: string, adminName: string) {
    if (!auth?.token || !confirm(`¿Borrar definitivamente a ${adminName}? Esta acción no se puede deshacer.`)) return;
    
    try {
      const res = await fetch(`/api/admin/roles/admins/${adminId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      
      const data = await res.json();
      
      if (res.ok) {
        alert("Administrador borrado");
        loadAdmins();
      } else {
        alert(`Error: ${data.error || "No se pudo borrar"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al borrar");
    }
  }

  function getRoleLabel(role: string) {
    const labels: Record<string, string> = {
      AGENT: "Agente",
      SUPERADMIN: "Super Administrador",
      CONTABLE: "Contable",
      MASTER: "Administrador Maestro"
    };
    return labels[role] || role;
  }

  function getRoleColor(role: string) {
    const colors: Record<string, string> = {
      AGENT: "#3b82f6",
      SUPERADMIN: "#8b5cf6",
      CONTABLE: "#10b981",
      MASTER: "#dc2626"
    };
    return colors[role] || "#94a3b8";
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Gestionar Administradores</h1>
          <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                padding: ".5rem 1rem",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                cursor: "pointer"
              }}
            >
              <option value="ALL">Todos los roles</option>
              <option value="AGENT">Agentes</option>
              <option value="SUPERADMIN">Super Administradores</option>
              <option value="CONTABLE">Contables</option>
              <option value="MASTER">Administradores Maestros</option>
            </select>
            <button
              onClick={() => {
                resetForm();
                setShowForm(!showForm);
              }}
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
              {showForm ? "Cancelar" : "+ Crear Administrador"}
            </button>
          </div>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: "1.5rem", display: "grid", gap: "1rem" }}>
            <h3 style={{ margin: 0, color: "var(--text-primary)" }}>{editingId ? "Modificar Administrador" : "Crear Nuevo Administrador"}</h3>
            <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
              ⚠️ Los campos marcados con * son obligatorios y NO se podrán modificar después de crear el administrador.
            </p>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                  Nombres *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Carlos"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  style={{ width: "100%", padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                  Apellido *
                </label>
                <input
                  type="text"
                  placeholder="Ej: González Pérez"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  style={{ width: "100%", padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                Cédula de Identidad *
              </label>
              <input
                type="text"
                placeholder="Ej: V-12345678"
                value={formData.documentId}
                onChange={(e) => setFormData({ ...formData, documentId: e.target.value })}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", width: "100%" }}
              />
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                Correo Electrónico *
              </label>
              <input
                type="email"
                placeholder="correo@ejemplo.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  setEmailError("");
                }}
                onBlur={() => checkEmailAvailability(formData.email)}
                style={{ 
                  padding: ".75rem", 
                  borderRadius: "8px", 
                  border: emailError ? "2px solid #ef4444" : "1px solid var(--border-color)", 
                  background: "var(--input-bg)", 
                  color: "var(--text-primary)",
                  width: "100%"
                }}
              />
              {emailError && <p style={{ color: "#ef4444", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>{emailError}</p>}
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                Rol de Administrador *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as "AGENT" | "SUPERADMIN" | "CONTABLE" | "MASTER" })}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", cursor: "pointer", width: "100%" }}
              >
                <option value="AGENT">Agente</option>
                <option value="SUPERADMIN">Super Administrador</option>
                <option value="CONTABLE">Contable</option>
                <option value="MASTER">Master</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "0.5rem", color: "var(--text-primary)", fontWeight: 600, fontSize: "0.875rem" }}>
                Contraseña *
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={editingId ? "Nueva contraseña (dejar vacío para no cambiar)" : "Mínimo 5 caracteres + 1 especial"}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (e.target.value && !validatePassword(e.target.value)) {
                      setPasswordError("Mínimo 5 caracteres alfanuméricos + 1 caracter especial (!@#$%^&*...)");
                    } else {
                      setPasswordError("");
                    }
                  }}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: "3rem",
                    borderRadius: "8px", 
                    border: passwordError ? "2px solid #ef4444" : "1px solid var(--border-color)", 
                    background: "var(--input-bg)", 
                    color: "var(--text-primary)",
                    width: "100%"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: "0.75rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1rem"
                  }}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
              {passwordError && <p style={{ color: "#ef4444", fontSize: "0.75rem", margin: "0.25rem 0 0" }}>{passwordError}</p>}
              <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem" }}>
                Debe contener al menos 5 caracteres alfanuméricos y 1 caracter especial
              </small>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
              <button
                onClick={handleSave}
                disabled={!!emailError || !!passwordError}
                style={{
                  padding: ".75rem 1.5rem",
                  background: emailError || passwordError ? "#6b7280" : "#85BB65",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  cursor: emailError || passwordError ? "not-allowed" : "pointer",
                  fontWeight: 700
                }}
              >
                {editingId ? "Guardar Cambios" : "Crear Administrador"}
              </button>
              <button
                onClick={resetForm}
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
        )}

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : admins.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay administradores registrados{roleFilter !== "ALL" ? ` con el rol ${getRoleLabel(roleFilter)}` : ""}
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {admins.map((admin) => (
              <div key={admin.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                <div style={{ flex: 1, minWidth: "250px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: ".5rem", marginBottom: ".5rem" }}>
                    <h3 style={{ margin: 0 }}>{admin.name}</h3>
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
                    {admin.suspended && (
                      <span
                        style={{
                          padding: ".25rem .5rem",
                          borderRadius: "4px",
                          background: "#dc2626",
                          color: "#fff",
                          fontSize: ".75rem",
                          fontWeight: 600
                        }}
                      >
                        SUSPENDIDO
                      </span>
                    )}
                  </div>
                  <p style={{ margin: ".25rem 0", color: "var(--text-secondary)" }}>{admin.email}</p>
                  {admin.username && (
                    <p style={{ margin: ".25rem 0", color: "var(--text-secondary)", fontSize: ".875rem" }}>
                      Usuario: {admin.username}
                    </p>
                  )}
                  <p style={{ margin: ".25rem 0", color: "var(--text-secondary)", fontSize: ".875rem" }}>
                    Creado: {new Date(admin.createdAt).toLocaleDateString()}
                    {admin.createdBy && ` por ${admin.createdBy.name}`}
                  </p>
                  {admin.suspended && (
                    <p style={{ margin: ".25rem 0", color: "#dc2626", fontSize: ".875rem", fontWeight: 600 }}>
                      ⚠️ SUSPENDIDO
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                  <button
                    onClick={() => startEdit(admin)}
                    style={{
                      padding: ".5rem 1rem",
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: "pointer"
                    }}
                  >
                    Modificar
                  </button>
                  <button
                    onClick={() => handleSuspend(admin)}
                    disabled={admin.role === "MASTER"}
                    style={{
                      padding: ".5rem 1rem",
                      background: admin.suspended ? "#85BB65" : "#f59e0b",
                      color: "#fff",
                      border: "none",
                      borderRadius: "8px",
                      cursor: admin.role === "MASTER" ? "not-allowed" : "pointer",
                      opacity: admin.role === "MASTER" ? 0.5 : 1
                    }}
                  >
                    {admin.suspended ? "Reactivar" : "Suspender"}
                  </button>
                  <button
                    onClick={() => handleDelete(admin.id, admin.name)}
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
              </div>
            ))}
          </div>
        )}
      </main>
    </>
  );
}

export default function GestionarAdminsPage() {
  return (
    <AuthGuard requiredRole={["MASTER"]}>
      <GestionarAdminsPageContent />
    </AuthGuard>
  );
}
