"use client";
import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
      } else {
        setError(data.error || "Error al enviar solicitud");
      }
    } catch (err) {
      setError("Error al enviar solicitud");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5E6", padding: "1rem" }}>
      <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "2rem" }}>
        <h1 style={{ margin: "0 0 1.5rem", color: "#3E3E3C" }}>Recuperar Contraseña</h1>
        
        {success ? (
          <div style={{ padding: "1rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", color: "#85BB65", marginBottom: "1rem" }}>
            Si el email existe, recibirás un enlace para restablecer tu contraseña.
          </div>
        ) : (
          <>
            <p style={{ margin: "0 0 1.5rem", color: "#6b7280", fontSize: "0.875rem" }}>
              Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
            </p>

            {error && (
              <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "#ef4444", marginBottom: "1rem" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "grid", gap: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", color: "#3E3E3C", fontWeight: 600 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
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
                {loading ? "Enviando..." : "Enviar Enlace"}
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
