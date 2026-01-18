"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";

export default function TwoFactorAuthPage() {
  const [auth, setAuth] = useState<any>(null);
  const [twoFactorAuth, setTwoFactorAuth] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [settingUp, setSettingUp] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verificationToken, setVerificationToken] = useState("");
  const [setupStep, setSetupStep] = useState<"none" | "qr" | "enabled">("none");

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      check2FAStatus();
    }
  }, [auth]);

  async function check2FAStatus() {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/status", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (res.ok && data.enabled) {
        setTwoFactorAuth({ enabled: true });
        setSetupStep("enabled");
      } else {
        setTwoFactorAuth(null);
        setSetupStep("none");
      }
    } catch (err) {
      console.error("Error:", err);
      setTwoFactorAuth(null);
      setSetupStep("none");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetup() {
    if (!auth?.token || settingUp) return;
    setSettingUp(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
      });

      const data = await res.json();
      if (res.ok) {
        setQrCode(data.qrCode || "");
        setSecret(data.secret || "");
        setSetupStep("qr");
      } else {
        alert(`Error: ${data.error || "No se pudo configurar 2FA"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al configurar 2FA");
    } finally {
      setSettingUp(false);
    }
  }

  async function handleVerify() {
    if (!auth?.token || !verificationToken || verifying) return;
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ token: verificationToken, enable: true }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("2FA habilitado exitosamente");
        setSetupStep("enabled");
        setVerificationToken("");
        check2FAStatus();
      } else {
        alert(`Error: ${data.error || "Token inválido"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al verificar token");
    } finally {
      setVerifying(false);
    }
  }

  async function handleDisable() {
    if (!auth?.token || !confirm("¿Estás seguro de desactivar 2FA? Esto reduce la seguridad de tu cuenta.")) return;

    const token = prompt("Ingresa tu código de 2FA para confirmar:");
    if (!token) return;

    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({ token }),
      });

      const data = await res.json();
      if (res.ok) {
        alert("2FA desactivado exitosamente");
        setSetupStep("none");
        setTwoFactorAuth(null);
        check2FAStatus();
      } else {
        alert(`Error: ${data.error || "Token inválido"}`);
      }
    } catch (err) {
      console.error("Error:", err);
      alert("Error al desactivar 2FA");
    }
  }

  return (
    <AuthGuard requiredRole={["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"]}>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Autenticación de Dos Factores (2FA)</h1>
          <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            ← Volver al Dashboard
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : setupStep === "enabled" || twoFactorAuth?.enabled ? (
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ padding: "1rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", marginBottom: "1.5rem" }}>
              <h3 style={{ margin: "0 0 0.5rem", color: "var(--color-primary)" }}>✅ 2FA Habilitado</h3>
              <p style={{ margin: 0, color: "var(--text-primary)" }}>
                Tu cuenta está protegida con autenticación de dos factores. Se te pedirá un código adicional al iniciar sesión.
              </p>
            </div>

            <button
              onClick={handleDisable}
              style={{
                padding: "0.75rem 1.5rem",
                background: "#ef4444",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Desactivar 2FA
            </button>
          </div>
        ) : setupStep === "qr" ? (
          <div className="card" style={{ padding: "2rem" }}>
            <h2 style={{ margin: "0 0 1.5rem", color: "var(--text-primary)" }}>Configurar 2FA</h2>
            <p style={{ margin: "0 0 1.5rem", color: "var(--text-tertiary)" }}>
              1. Escanea el código QR con tu app autenticadora (Google Authenticator, Authy, etc.)
            </p>
            <p style={{ margin: "0 0 1.5rem", color: "var(--text-tertiary)" }}>
              2. O ingresa manualmente este código: <strong style={{ fontFamily: "monospace", color: "var(--text-primary)" }}>{secret}</strong>
            </p>

            {qrCode && (
              <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
                <img src={qrCode} alt="QR Code" style={{ maxWidth: "300px", border: "1px solid var(--border-color)", borderRadius: "8px" }} />
              </div>
            )}

            <p style={{ margin: "0 0 1rem", color: "var(--text-tertiary)" }}>
              3. Ingresa el código de 6 dígitos que muestra tu app:
            </p>

            <div style={{ display: "grid", gap: "1rem" }}>
              <input
                type="text"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: "100%",
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg)",
                  color: "var(--text-primary)",
                  fontSize: "1.5rem",
                  textAlign: "center",
                  letterSpacing: "0.5rem",
                  fontFamily: "monospace",
                }}
              />

              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleVerify}
                  disabled={verifying || verificationToken.length !== 6}
                  style={{
                    flex: 1,
                    padding: "0.75rem 1.5rem",
                    background: verifying || verificationToken.length !== 6 ? "#6b7280" : "#85BB65",
                    color: "var(--text-primary)",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: verifying || verificationToken.length !== 6 ? "not-allowed" : "pointer",
                  }}
                >
                  {verifying ? "Verificando..." : "Verificar y Habilitar"}
                </button>
                <button
                  onClick={() => {
                    setSetupStep("none");
                    setQrCode("");
                    setSecret("");
                    setVerificationToken("");
                  }}
                  style={{
                    padding: "0.75rem 1.5rem",
                    background: "#6b7280",
                    color: "#fff",
                    border: "none",
                    borderRadius: "8px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card" style={{ padding: "2rem" }}>
            <div style={{ marginBottom: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>¿Qué es 2FA?</h2>
              <p style={{ margin: "0 0 1rem", color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                La autenticación de dos factores (2FA) añade una capa adicional de seguridad a tu cuenta. 
                Cuando esté habilitado, necesitarás tu contraseña y un código temporal generado por una app autenticadora 
                para iniciar sesión.
              </p>
              <p style={{ margin: 0, color: "var(--text-tertiary)", lineHeight: 1.6 }}>
                <strong>Recomendado para:</strong> Todos los administradores que manejan información sensible o transacciones.
              </p>
            </div>

            <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", marginBottom: "1.5rem" }}>
              <p style={{ margin: 0, color: "#ef4444", fontWeight: 600 }}>
                ⚠️ Actualmente 2FA no está habilitado en tu cuenta.
              </p>
            </div>

            <button
              onClick={handleSetup}
              disabled={settingUp}
              style={{
                padding: "0.75rem 1.5rem",
                background: settingUp ? "#6b7280" : "#85BB65",
                color: "var(--text-primary)",
                border: "none",
                borderRadius: "8px",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: settingUp ? "not-allowed" : "pointer",
              }}
            >
              {settingUp ? "Configurando..." : "Configurar 2FA"}
            </button>
          </div>
        )}
      </main>
    </AuthGuard>
  );
}
