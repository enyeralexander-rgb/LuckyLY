"use client";
import Link from "next/link";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth, clearStoredAuth, setStoredAuth } from "../../../../lib/clientAuth";
import { useRouter } from "next/navigation";

type UserData = {
  id: string;
  name: string;
  email: string;
  username: string | null;
  emailVerified: boolean;
  emailUpdatedAt: string | null;
  usernameUpdatedAt: string | null;
};

export default function ConfiguracionPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"verification" | "email" | "username" | "password" | "delete">("verification");
  const [sendingVerification, setSendingVerification] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    username: "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailRestriction, setEmailRestriction] = useState<{ canChange: boolean; daysRemaining: number } | null>(null);
  const [usernameRestriction, setUsernameRestriction] = useState<{ canChange: boolean; daysRemaining: number } | null>(null);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  // Función para calcular días restantes
  function calculateDaysRemaining(lastUpdateDate: string | null): { canChange: boolean; daysRemaining: number } {
    if (!lastUpdateDate) {
      return { canChange: true, daysRemaining: 0 };
    }
    const lastUpdate = new Date(lastUpdateDate);
    const now = new Date();
    const daysSinceUpdate = Math.floor((now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, 30 - daysSinceUpdate);
    return { canChange: daysRemaining === 0, daysRemaining };
  }

  useEffect(() => {
    if (auth?.token) {
      setLoading(true);
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (data.error) {
            console.error("Error:", data.error);
            setLoading(false);
            return;
          }
          setUserData(data);
          setFormData({
            email: data.email || "",
            username: data.username || "",
            currentPassword: "",
            newPassword: "",
            confirmPassword: ""
          });
          // Calcular restricciones de cambio
          setEmailRestriction(calculateDaysRemaining(data.emailUpdatedAt));
          setUsernameRestriction(calculateDaysRemaining(data.usernameUpdatedAt));
          setLoading(false);
        })
        .catch((err) => {
          console.error("Error al cargar perfil:", err);
          setLoading(false);
        });
    }
  }, [auth]);

  async function handleUpdateEmail() {
    if (!auth?.token || saving) return;
    if (!formData.email || formData.email === userData?.email) {
      setErrors({ email: "El correo debe ser diferente al actual" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/user/account/update-email", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ email: formData.email })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Correo actualizado exitosamente. Por favor, inicia sesión nuevamente.");
        clearStoredAuth();
        router.push("/auth/login");
      } else {
        setErrors({ email: data.error || "Error al actualizar correo" });
      }
    } catch (error) {
      console.error("Error:", error);
      setErrors({ email: "Error al actualizar correo" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdateUsername() {
    if (!auth?.token || saving) return;
    if (!formData.username || formData.username === userData?.username) {
      setErrors({ username: "El nombre de usuario debe ser diferente al actual" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/user/account/update-username", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ username: formData.username })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Nombre de usuario actualizado exitosamente");
        setUserData({ ...userData!, username: formData.username });
        setErrors({});
        // Disparar evento para actualizar NavBar
        window.dispatchEvent(new Event("usernameUpdated"));
        // Actualizar localStorage
        const storedAuth = getStoredAuth();
        if (storedAuth) {
          const updatedUser = { ...storedAuth.user, username: formData.username };
          setStoredAuth({ ...storedAuth, user: updatedUser as any });
        }
      } else {
        setErrors({ username: data.error || "Error al actualizar nombre de usuario" });
      }
    } catch (error) {
      console.error("Error:", error);
      setErrors({ username: "Error al actualizar nombre de usuario" });
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePassword() {
    if (!auth?.token || saving) return;
    if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
      setErrors({ password: "Todos los campos son obligatorios" });
      return;
    }
    if (formData.newPassword !== formData.confirmPassword) {
      setErrors({ password: "Las contraseñas no coinciden" });
      return;
    }
    if (formData.newPassword.length < 8) {
      setErrors({ password: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }

    setSaving(true);
    setErrors({});
    try {
      const res = await fetch("/api/user/account/update-password", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword
        })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Contraseña actualizada exitosamente");
        setFormData({ ...formData, currentPassword: "", newPassword: "", confirmPassword: "" });
        setErrors({});
      } else {
        setErrors({ password: data.error || "Error al actualizar contraseña" });
      }
    } catch (error) {
      console.error("Error:", error);
      setErrors({ password: "Error al actualizar contraseña" });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    if (!auth?.token) return;
    if (!confirm("¿Estás seguro de que deseas eliminar tu cuenta? Esta acción no se puede deshacer.")) return;
    if (!confirm("Esta acción eliminará permanentemente todos tus datos. ¿Continuar?")) return;

    const password = prompt("Por seguridad, ingresa tu contraseña para confirmar:");
    if (!password) return;

    try {
      const res = await fetch("/api/user/account/delete", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (res.ok) {
        alert("Cuenta eliminada exitosamente");
        clearStoredAuth();
        router.push("/");
      } else {
        alert(data.error || "Error al eliminar cuenta");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al eliminar cuenta");
    }
  }

  if (loading) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>CONFIGURACIÓN DE LA CUENTA</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver a MI CUENTA</Link>
        </div>

        {/* Pestañas */}
        <div style={{ display: "flex", gap: ".5rem", borderBottom: "2px solid var(--border-color)", marginBottom: "2rem", flexWrap: "wrap" }}>
          <button
            onClick={() => setActiveTab("verification")}
            style={{
              padding: ".75rem 1.5rem",
              background: activeTab === "verification" 
                ? (userData?.emailVerified ? "#85BB65" : "#f59e0b") 
                : "transparent",
              color: activeTab === "verification" 
                ? (userData?.emailVerified ? "#3E3E3C" : "#ffffff") 
                : (userData?.emailVerified ? "#85BB65" : "#f59e0b"),
              border: "none",
              borderBottom: activeTab === "verification" 
                ? `3px solid ${userData?.emailVerified ? "#85BB65" : "#f59e0b"}` 
                : "3px solid transparent",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            {userData?.emailVerified ? "✓ Verificado" : "⚠️ Verificación"}
          </button>
          <button
            onClick={() => setActiveTab("email")}
            style={{
              padding: ".75rem 1.5rem",
              background: activeTab === "email" ? "#85BB65" : "transparent",
              color: activeTab === "email" ? "#3E3E3C" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "email" ? "3px solid #85BB65" : "3px solid transparent",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Correo
          </button>
          <button
            onClick={() => setActiveTab("username")}
            style={{
              padding: ".75rem 1.5rem",
              background: activeTab === "username" ? "#85BB65" : "transparent",
              color: activeTab === "username" ? "#3E3E3C" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "username" ? "3px solid #85BB65" : "3px solid transparent",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Nombre de Usuario
          </button>
          <button
            onClick={() => setActiveTab("password")}
            style={{
              padding: ".75rem 1.5rem",
              background: activeTab === "password" ? "#85BB65" : "transparent",
              color: activeTab === "password" ? "#3E3E3C" : "#6b7280",
              border: "none",
              borderBottom: activeTab === "password" ? "3px solid #85BB65" : "3px solid transparent",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Contraseña
          </button>
          <button
            onClick={() => setActiveTab("delete")}
            style={{
              padding: ".75rem 1.5rem",
              background: activeTab === "delete" ? "#ef4444" : "transparent",
              color: activeTab === "delete" ? "#ffffff" : "#ef4444",
              border: "none",
              borderBottom: activeTab === "delete" ? "3px solid #ef4444" : "3px solid transparent",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s"
            }}
          >
            Eliminar Cuenta
          </button>
        </div>

        {/* Contenido de pestañas */}
        <div className="card" style={{ padding: "2rem" }}>
          {activeTab === "verification" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>Verificación de Correo Electrónico</h3>
                {userData?.emailVerified ? (
                  <div style={{ padding: "1.5rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", textAlign: "center" }}>
                    <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>✅</div>
                    <h4 style={{ margin: "0 0 0.5rem", color: "#85BB65" }}>¡Tu correo está verificado!</h4>
                    <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                      Tienes acceso completo a todas las funciones de la plataforma.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ padding: "1.5rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", marginBottom: "1rem" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1rem" }}>
                        <span style={{ fontSize: "2rem" }}>⚠️</span>
                        <div>
                          <h4 style={{ margin: 0, color: "#f59e0b" }}>Correo no verificado</h4>
                          <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                            Debes verificar tu correo electrónico para poder realizar compras.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    {verificationSent ? (
                      <div style={{ padding: "1rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", marginBottom: "1rem" }}>
                        <p style={{ margin: 0, color: "#85BB65", fontWeight: 600 }}>
                          ✓ Email de verificación enviado a {userData?.email}
                        </p>
                        <p style={{ margin: "0.5rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                          Revisa tu bandeja de entrada y sigue las instrucciones del correo.
                        </p>
                      </div>
                    ) : (
                      <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        Haz clic en el botón para recibir un correo de verificación en: <strong>{userData?.email}</strong>
                      </p>
                    )}
                    
                    <button
                      onClick={async () => {
                        if (!auth?.token || sendingVerification) return;
                        setSendingVerification(true);
                        try {
                          const res = await fetch("/api/auth/send-verification-email", {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${auth.token}`
                            }
                          });
                          const data = await res.json();
                          if (res.ok) {
                            setVerificationSent(true);
                          } else {
                            alert(data.error || "Error al enviar email de verificación");
                          }
                        } catch (error) {
                          console.error("Error:", error);
                          alert("Error al enviar email de verificación");
                        } finally {
                          setSendingVerification(false);
                        }
                      }}
                      disabled={sendingVerification || verificationSent}
                      style={{
                        padding: ".75rem 1.5rem",
                        background: sendingVerification || verificationSent ? "#6b7280" : "#f59e0b",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: sendingVerification || verificationSent ? "not-allowed" : "pointer"
                      }}
                    >
                      {sendingVerification ? "Enviando..." : verificationSent ? "Email Enviado" : "📧 Enviar Email de Verificación"}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {activeTab === "email" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>Cambiar Correo Electrónico</h3>
                <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Ingresa tu nuevo correo electrónico. Deberás iniciar sesión nuevamente después del cambio.
                </p>
                {/* Restricción de 30 días */}
                {emailRestriction && !emailRestriction.canChange && (
                  <div style={{ 
                    padding: "1rem", 
                    background: "rgba(239, 68, 68, 0.1)", 
                    border: "2px solid #ef4444", 
                    borderRadius: "8px", 
                    marginBottom: "1rem" 
                  }}>
                    <p style={{ margin: 0, color: "#ef4444", fontWeight: 600, fontSize: "0.875rem" }}>
                      ⏳ Solo puedes cambiar tu correo una vez cada 30 días.
                    </p>
                    <p style={{ margin: "0.5rem 0 0", color: "#ef4444", fontSize: "0.875rem" }}>
                      Faltan <strong>{emailRestriction.daysRemaining} días</strong> para poder realizar otro cambio.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Nuevo Correo Electrónico
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    setErrors({ ...errors, email: "" });
                  }}
                  onBlur={() => {
                    // Validación en tiempo real (On Blur)
                    if (emailRestriction && !emailRestriction.canChange) {
                      setErrors({ ...errors, email: `No puedes cambiar tu correo aún. Faltan ${emailRestriction.daysRemaining} días.` });
                    } else if (formData.email && formData.email === userData?.email) {
                      setErrors({ ...errors, email: "El correo debe ser diferente al actual" });
                    }
                  }}
                  placeholder="nuevo@correo.com"
                  disabled={emailRestriction && !emailRestriction.canChange}
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: errors.email ? "2px solid #ef4444" : "1px solid var(--border-color)",
                    background: emailRestriction && !emailRestriction.canChange ? "var(--input-disabled-bg)" : "var(--input-bg)",
                    color: emailRestriction && !emailRestriction.canChange ? "var(--text-secondary)" : "var(--text-primary)",
                    fontSize: "1rem",
                    cursor: emailRestriction && !emailRestriction.canChange ? "not-allowed" : "text"
                  }}
                />
                {errors.email && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: "0.5rem 0 0" }}>{errors.email}</p>}
              </div>
              <button
                onClick={handleUpdateEmail}
                disabled={saving || !formData.email || formData.email === userData?.email || (emailRestriction && !emailRestriction.canChange)}
                style={{
                  padding: ".75rem 1.5rem",
                  background: saving || !formData.email || formData.email === userData?.email || (emailRestriction && !emailRestriction.canChange) ? "#6b7280" : "#85BB65",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: saving || !formData.email || formData.email === userData?.email || (emailRestriction && !emailRestriction.canChange) ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "Guardando..." : "Actualizar Correo"}
              </button>
            </div>
          )}

          {activeTab === "username" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>Cambiar Nombre de Usuario</h3>
                <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Elige un nombre de usuario único que te identifique en la plataforma.
                </p>
                {/* Restricción de 30 días */}
                {usernameRestriction && !usernameRestriction.canChange && (
                  <div style={{ 
                    padding: "1rem", 
                    background: "rgba(239, 68, 68, 0.1)", 
                    border: "2px solid #ef4444", 
                    borderRadius: "8px", 
                    marginBottom: "1rem" 
                  }}>
                    <p style={{ margin: 0, color: "#ef4444", fontWeight: 600, fontSize: "0.875rem" }}>
                      ⏳ Solo puedes cambiar tu nombre de usuario una vez cada 30 días.
                    </p>
                    <p style={{ margin: "0.5rem 0 0", color: "#ef4444", fontSize: "0.875rem" }}>
                      Faltan <strong>{usernameRestriction.daysRemaining} días</strong> para poder realizar otro cambio.
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                  Nuevo Nombre de Usuario
                </label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value });
                    setErrors({ ...errors, username: "" });
                  }}
                  onBlur={() => {
                    // Validación en tiempo real (On Blur)
                    if (usernameRestriction && !usernameRestriction.canChange) {
                      setErrors({ ...errors, username: `No puedes cambiar tu nombre de usuario aún. Faltan ${usernameRestriction.daysRemaining} días.` });
                    } else if (formData.username && formData.username === userData?.username) {
                      setErrors({ ...errors, username: "El nombre de usuario debe ser diferente al actual" });
                    } else if (formData.username && formData.username.length < 3) {
                      setErrors({ ...errors, username: "El nombre de usuario debe tener al menos 3 caracteres" });
                    }
                  }}
                  placeholder="mi_usuario"
                  disabled={usernameRestriction && !usernameRestriction.canChange}
                  style={{
                    width: "100%",
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: errors.username ? "2px solid #ef4444" : "1px solid var(--border-color)",
                    background: usernameRestriction && !usernameRestriction.canChange ? "var(--input-disabled-bg)" : "var(--input-bg)",
                    color: usernameRestriction && !usernameRestriction.canChange ? "var(--text-secondary)" : "var(--text-primary)",
                    fontSize: "1rem",
                    cursor: usernameRestriction && !usernameRestriction.canChange ? "not-allowed" : "text"
                  }}
                />
                {errors.username && <p style={{ color: "#ef4444", fontSize: "0.875rem", margin: "0.5rem 0 0" }}>{errors.username}</p>}
              </div>
              <button
                onClick={handleUpdateUsername}
                disabled={saving || !formData.username || formData.username === userData?.username || (usernameRestriction && !usernameRestriction.canChange)}
                style={{
                  padding: ".75rem 1.5rem",
                  background: saving || !formData.username || formData.username === userData?.username || (usernameRestriction && !usernameRestriction.canChange) ? "#6b7280" : "#85BB65",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: saving || !formData.username || formData.username === userData?.username || (usernameRestriction && !usernameRestriction.canChange) ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "Guardando..." : "Actualizar Nombre de Usuario"}
              </button>
            </div>
          )}

          {activeTab === "password" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>Cambiar Contraseña</h3>
                <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Por seguridad, ingresa tu contraseña actual y luego tu nueva contraseña.
                </p>
              </div>
              <div style={{ display: "grid", gap: "1rem" }}>
                <div>
                  <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Contraseña Actual
                  </label>
                  <input
                    type="password"
                    value={formData.currentPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, currentPassword: e.target.value });
                      setErrors({ ...errors, password: "" });
                    }}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      borderRadius: "8px",
                      border: errors.password ? "2px solid #ef4444" : "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, newPassword: e.target.value });
                      setErrors({ ...errors, password: "" });
                    }}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      borderRadius: "8px",
                      border: errors.password ? "2px solid #ef4444" : "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                    Confirmar Nueva Contraseña
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => {
                      setFormData({ ...formData, confirmPassword: e.target.value });
                      setErrors({ ...errors, password: "" });
                    }}
                    placeholder="••••••••"
                    style={{
                      width: "100%",
                      padding: ".75rem",
                      borderRadius: "8px",
                      border: errors.password ? "2px solid #ef4444" : "1px solid var(--border-color)",
                      background: "var(--input-bg)",
                      color: "var(--text-primary)",
                      fontSize: "1rem"
                    }}
                  />
                </div>
                {errors.password && <p style={{ color: "#ef4444", fontSize: "0.875rem" }}>{errors.password}</p>}
              </div>
              <button
                onClick={handleUpdatePassword}
                disabled={saving || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword}
                style={{
                  padding: ".75rem 1.5rem",
                  background: saving || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword ? "#6b7280" : "#85BB65",
                  color: "var(--text-primary)",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: saving || !formData.currentPassword || !formData.newPassword || !formData.confirmPassword ? "not-allowed" : "pointer"
                }}
              >
                {saving ? "Guardando..." : "Actualizar Contraseña"}
              </button>
            </div>
          )}

          {activeTab === "delete" && (
            <div style={{ display: "grid", gap: "1.5rem" }}>
              <div>
                <h3 style={{ margin: "0 0 1rem", color: "#ef4444" }}>Eliminar Cuenta</h3>
                <p style={{ margin: "0 0 1rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                  Esta acción eliminará permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.
                </p>
                <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", marginBottom: "1rem" }}>
                  <p style={{ margin: 0, color: "#ef4444", fontSize: "0.875rem", fontWeight: 600 }}>
                    ⚠️ Advertencia: Al eliminar tu cuenta se perderán:
                  </p>
                  <ul style={{ margin: "0.5rem 0 0", paddingLeft: "1.5rem", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                    <li>Todos tus tickets y compras</li>
                    <li>Tu historial de jugadas</li>
                    <li>Tus datos personales</li>
                    <li>Acceso a premios no reclamados</li>
                  </ul>
                </div>
              </div>
              <button
                onClick={handleDeleteAccount}
                style={{
                  padding: ".75rem 1.5rem",
                  background: "#ef4444",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Eliminar Mi Cuenta
              </button>
            </div>
          )}
        </div>
      </main>
    </AuthGuard>
  );
}
