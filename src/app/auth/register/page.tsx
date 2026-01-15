"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { setStoredAuth } from "../../../lib/clientAuth";
import { NavBar } from "../../../components/NavBar";
import { Footer } from "../../../components/Footer";

function RegisterPageContent() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Capturar código de referido desde la URL
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      // Guardar en localStorage para persistir durante la sesión
      localStorage.setItem("referralCode", refCode);
    } else {
      // Intentar recuperar de localStorage
      const storedRef = localStorage.getItem("referralCode");
      if (storedRef) {
        setReferralCode(storedRef);
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (showTermsModal && !termsContent) {
      setLoadingTerms(true);
      fetch("/api/public/terms")
        .then((r) => r.json())
        .then((data) => {
          setTermsContent(data.content || "No hay términos y condiciones disponibles.");
          setLoadingTerms(false);
        })
        .catch(() => {
          setTermsContent("Error al cargar los términos y condiciones.");
          setLoadingTerms(false);
        });
    }
  }, [showTermsModal, termsContent]);

  function validateAge(dateString: string): boolean {
    if (!dateString) return true; // Permitir campo vacío temporalmente
    const today = new Date();
    const birth = new Date(dateString);
    const age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    const actualAge = monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate()) ? age - 1 : age;
    return actualAge >= 18;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    // Validar edad
    if (!validateAge(birthDate)) {
      setMessage("Debes ser mayor de 18 años para registrarte");
      return;
    }

    // Validar aceptación de términos
    if (!acceptTerms) {
      setMessage("Debes aceptar los términos y condiciones para registrarte");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, username, birthDate, email, password, acceptTerms, referralCode: referralCode || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Error al registrarse");
      } else {
        // Autologin para obtener token y redirigir
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        const loginData = await loginRes.json();
        if (loginRes.ok) {
          setStoredAuth({ token: loginData.token, user: loginData.user });
          // Limpiar código de referido después del registro exitoso
          if (referralCode) {
            localStorage.removeItem("referralCode");
          }
          const role = loginData.user.role;
          router.push(role === "AGENT" || role === "CONTABLE" || role === "SUPERADMIN" || role === "MASTER" ? "/admin" : "/");
        } else {
          setMessage("Registro exitoso. Inicia sesión para continuar.");
        }
      }
    } catch (err) {
      setMessage("Error de red");
    } finally {
      setLoading(false);
    }
  }

  const isAgeValid = birthDate ? validateAge(birthDate) : true;

  return (
    <>
      <NavBar />
      <main className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem", maxWidth: "520px", minHeight: "calc(100vh - 200px)" }}>
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Crear cuenta</h1>
          <form style={{ display: "grid", gap: ".75rem" }} onSubmit={handleSubmit}>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Nombre completo</span>
              <input
                type="text"
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#F5F5E6", color: "#3E3E3C" }}
              />
            </label>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Nombre de usuario</span>
              <input
                type="text"
                name="username"
                required
                minLength={3}
                maxLength={30}
                pattern="[a-zA-Z0-9_]+"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#F5F5E6", color: "#3E3E3C" }}
              />
              <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                Solo letras, números y guiones bajos. Mínimo 3 caracteres.
              </small>
            </label>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Fecha de nacimiento (18+)</span>
              <input
                type="date"
                name="birthDate"
                required
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{ 
                  padding: ".75rem", 
                  borderRadius: "8px", 
                  border: isAgeValid ? "1px solid #d4d4c4" : "2px solid #ef4444", 
                  background: "#F5F5E6", 
                  color: "#3E3E3C" 
                }}
              />
              {!isAgeValid && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>
                  Debes ser mayor de 18 años para registrarte
                </small>
              )}
            </label>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Email</span>
              <input
                type="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#F5F5E6", color: "#3E3E3C" }}
              />
            </label>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Contraseña</span>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#F5F5E6", color: "#3E3E3C" }}
              />
            </label>
            <label style={{ display: "flex", gap: ".5rem", alignItems: "start", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                style={{ marginTop: "0.25rem", cursor: "pointer" }}
              />
              <span style={{ fontSize: "0.875rem", color: "#3E3E3C" }}>
                Acepto los{" "}
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setShowTermsModal(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#85BB65",
                    textDecoration: "underline",
                    cursor: "pointer",
                    padding: 0,
                    fontSize: "0.875rem"
                  }}
                >
                  TÉRMINOS Y CONDICIONES
                </button>
              </span>
            </label>
            <button 
              type="submit" 
              disabled={loading || !acceptTerms || !isAgeValid} 
              style={{ 
                padding: ".75rem", 
                background: loading || !acceptTerms || !isAgeValid ? "#6b7280" : "#85BB65", 
                color: "#3E3E3C", 
                border: "none", 
                borderRadius: "10px", 
                fontWeight: 700, 
                cursor: loading || !acceptTerms || !isAgeValid ? "not-allowed" : "pointer"
              }}
            >
              {loading ? "Registrando..." : "Registrarme"}
            </button>
          </form>
          {message && <p style={{ color: "#f97316", margin: 0 }}>{message}</p>}
          <Link href="/auth/login" style={{ color: "#85BB65" }}>¿Ya tienes cuenta? Inicia sesión</Link>
        </div>
      </main>

      {/* Modal de Términos y Condiciones */}
      {showTermsModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: "1rem"
          }}
          onClick={() => setShowTermsModal(false)}
        >
          <div
            className="card"
            style={{
              maxWidth: "800px",
              maxHeight: "80vh",
              width: "100%",
              padding: "2rem",
              overflow: "auto",
              position: "relative"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
              <h2 style={{ margin: 0, color: "#3E3E3C" }}>Términos y Condiciones</h2>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#6b7280",
                  padding: "0.25rem 0.5rem"
                }}
              >
                ×
              </button>
            </div>
            {loadingTerms ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>Cargando...</div>
            ) : (
              <div style={{ whiteSpace: "pre-wrap", lineHeight: "1.8", color: "#3E3E3C" }}>
                {termsContent || "No hay términos y condiciones disponibles."}
              </div>
            )}
            <div style={{ marginTop: "1.5rem", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowTermsModal(false)}
                style={{
                  padding: ".75rem 1.5rem",
                  background: "#85BB65",
                  color: "#3E3E3C",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando...</div>}>
      <RegisterPageContent />
    </Suspense>
  );
}
