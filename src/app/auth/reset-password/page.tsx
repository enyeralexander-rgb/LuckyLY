"use client";
import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("Token inválido");
    }
  }, [token]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      } else {
        setError(data.error || "Error al restablecer contraseña");
      }
    } catch (err) {
      setError("Error al restablecer contraseña");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5E6", padding: "1rem" }}>
        <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
          <h1 style={{ margin: "0 0 1.5rem", color: "#3E3E3C" }}>Token Inválido</h1>
          <p style={{ margin: "0 0 1.5rem", color: "#6b7280" }}>
            El enlace de recuperación no es válido o ha expirado.
          </p>
          <Link href="/auth/login" style={{ color: "#85BB65", textDecoration: "none" }}>
            ← Volver al Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5E6", padding: "1rem" }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", color: "#3E3E3C" }}>Restablecer Contraseña</h1>

        {success ? (
          <div style={{ padding: "1rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", color: "#85BB65", marginBottom: "1rem" }}>
            Contraseña restablecida exitosamente. Redirigiendo al login...
          </div>
        ) : (
          <>
            {error && (
              <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "#ef4444", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#3E3E3C", fontWeight: 600 }}>
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #d4d4c4",
                    background: "#F5F5E6",
                    color: "#3E3E3C",
                    fontSize: "1rem"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#3E3E3C", fontWeight: 600 }}>
                  Confirmar Contraseña
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    border: "1px solid #d4d4c4",
                    background: "#F5F5E6",
                    color: "#3E3E3C",
                    fontSize: "1rem"
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "0.75rem 1.5rem",
                  background: loading ? "#6b7280" : "#85BB65",
                  color: "#3E3E3C",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  fontSize: "1rem",
                  cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Restableciendo..." : "Restablecer Contraseña"}
              </button>
            </form>
          </>
        )}

        <div style={{ marginTop: "1.5rem", textAlign: "center" }}>
          <Link href="/auth/login" style={{ color: "#85BB65", textDecoration: "none", fontSize: "0.875rem" }}>
            ← Volver al Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando...</div>}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
