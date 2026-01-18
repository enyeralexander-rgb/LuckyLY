"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setStoredAuth } from "../../../lib/clientAuth";
import { Footer } from "../../../components/Footer";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setEmailError(null);

    // Validar formato de email antes de enviar
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      setEmailError("Formato de correo inválido");
      return;
    }

    if (!password || password.length === 0) {
      setMessage("La contraseña es requerida");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Error al parsear respuesta:", parseError);
        setMessage("Error en la respuesta del servidor");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : (data.error?.message || "Error al iniciar sesión");
        setMessage(errorMessage);
      } else {
        if (!data.token || !data.user) {
          setMessage("Respuesta del servidor incompleta");
          setLoading(false);
          return;
        }
        setStoredAuth({ token: data.token, user: data.user });
        const role = data.user.role;
        // Usar window.location.href para redirección completa y evitar problemas de caché
        // Redirigir todos los roles de administrador al dashboard
        const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(role);
        window.location.href = isAdmin ? "/admin" : "/";
      }
    } catch (err) {
      console.error("Error al iniciar sesión:", err);
      setMessage("Error de conexión. Verifica tu conexión a internet.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem", maxWidth: "420px", minHeight: "calc(100vh - 200px)" }}>
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Ingresar</h1>
          <form style={{ display: "grid", gap: ".75rem" }} onSubmit={handleSubmit}>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Correo</span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setEmailError(null);
                }}
                onBlur={() => {
                  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
                  if (email && !emailRegex.test(email)) {
                    setEmailError("Formato de correo inválido");
                  } else {
                    setEmailError(null);
                  }
                }}
                style={{ 
                  padding: ".75rem", 
                  borderRadius: "8px", 
                  border: emailError ? "2px solid var(--text-error)" : "1px solid var(--border-input)", 
                  background: "var(--input-bg)", 
                  color: "var(--text-primary)" 
                }}
              />
              {emailError && (
                <small style={{ color: "var(--text-error)", fontSize: "0.75rem" }}>{emailError}</small>
              )}
            </label>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Contraseña</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: "3rem",
                    borderRadius: "8px", 
                    border: "1px solid var(--border-input)", 
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
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "1.25rem",
                    padding: "0.25rem",
                    lineHeight: 1
                  }}
                  title={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {showPassword ? "🙈" : "👁️"}
                </button>
              </div>
            </label>
            <button type="submit" disabled={loading} style={{ padding: ".75rem", background: "var(--button-primary)", color: "var(--button-text)", border: "none", borderRadius: "10px", fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
          </form>
          {message && <p style={{ color: "var(--text-error)", margin: 0 }}>{message}</p>}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "center" }}>
            <Link href="/auth/forgot-password" style={{ color: "var(--color-primary)", fontSize: "0.875rem", textDecoration: "none" }}>
              ¿Olvidaste tu contraseña?
            </Link>
            <Link href="/auth/register" style={{ color: "var(--color-primary)" }}>¿No tienes cuenta? Regístrate</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

