"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { setStoredAuth } from "../../../lib/clientAuth";
import { Footer } from "../../../components/Footer";

function RegisterPageContent() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [documentIdType, setDocumentIdType] = useState<"V" | "E">("V");
  const [documentIdNumber, setDocumentIdNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [termsContent, setTermsContent] = useState("");
  const [loadingTerms, setLoadingTerms] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  // Estados para validación en tiempo real
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [documentIdError, setDocumentIdError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasNumber: false,
    hasSpecial: false
  });
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [checkingDocumentId, setCheckingDocumentId] = useState(false);
  
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Capturar código de referido desde la URL
    const refCode = searchParams.get("ref");
    if (refCode) {
      setReferralCode(refCode);
      localStorage.setItem("referralCode", refCode);
    } else {
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

  // Función para verificar disponibilidad
  async function checkAvailability(field: "username" | "email" | "documentId", value: string) {
    if (!value || value.trim().length === 0) {
      return;
    }

    const cleanValue = value.trim();
    if (field === "username" && cleanValue.length < 5) {
      return;
    }
    if (field === "documentId" && cleanValue.length < 1) {
      return;
    }

    try {
      if (field === "username") setCheckingUsername(true);
      if (field === "email") setCheckingEmail(true);
      if (field === "documentId") setCheckingDocumentId(true);

      const res = await fetch(`/api/auth/check-availability?field=${field}&value=${encodeURIComponent(cleanValue)}`);
      const data = await res.json();

      if (res.ok) {
        if (!data.available) {
          const errorMessages = {
            username: "Este nombre de usuario ya está en uso",
            email: "Este correo ya está registrado",
            documentId: "Este ID ya está registrado"
          };
          if (field === "username") setUsernameError(errorMessages.username);
          if (field === "email") setEmailError(errorMessages.email);
          if (field === "documentId") setDocumentIdError(errorMessages.documentId);
        } else {
          if (field === "username") setUsernameError(null);
          if (field === "email") setEmailError(null);
          if (field === "documentId") setDocumentIdError(null);
        }
      }
    } catch (err) {
      console.error("Error al verificar disponibilidad:", err);
    } finally {
      if (field === "username") setCheckingUsername(false);
      if (field === "email") setCheckingEmail(false);
      if (field === "documentId") setCheckingDocumentId(false);
    }
  }

  // Validar contraseña
  function validatePassword(pwd: string) {
    const requirements = {
      minLength: pwd.length >= 8,
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[@$!%*?&.]/.test(pwd)
    };
    setPasswordRequirements(requirements);
    
    const isValid = requirements.minLength && requirements.hasNumber && requirements.hasSpecial;
    if (pwd && !isValid) {
      setPasswordError("La contraseña no cumple con los requisitos");
    } else {
      setPasswordError(null);
    }
    return isValid;
  }

  // Validar que las contraseñas coincidan
  const passwordsMatch = password === confirmPassword;
  const confirmPasswordError = confirmPassword && !passwordsMatch ? "Las contraseñas no coinciden" : null;

  // Construir documentId completo
  const documentId = documentIdNumber ? `${documentIdType}-${documentIdNumber}` : "";

  // Validar si el formulario puede enviarse
  const canSubmit = 
    name.length >= 3 &&
    username.length >= 5 &&
    /^[a-zA-Z0-9]+$/.test(username) &&
    documentIdNumber.length > 0 &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) &&
    password.length >= 8 &&
    /\d/.test(password) &&
    /[@$!%*?&.]/.test(password) &&
    passwordsMatch &&
    acceptTerms &&
    !usernameError &&
    !emailError &&
    !documentIdError &&
    !passwordError &&
    !checkingUsername &&
    !checkingEmail &&
    !checkingDocumentId;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    // Validar aceptación de términos
    if (!acceptTerms) {
      setMessage("Debes aceptar los términos y condiciones para registrarte");
      return;
    }

    // Validar que las contraseñas coincidan
    if (!passwordsMatch) {
      setMessage("Las contraseñas no coinciden");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          name, 
          username, 
          documentId, // Ya incluye el formato "V-12345678"
          email, 
          password, 
          acceptTerms, 
          referralCode: referralCode || undefined 
        })
      });
      
      let data;
      try {
        data = await res.json();
      } catch (parseError) {
        console.error("Error al parsear respuesta:", parseError);
        setMessage("Error en la respuesta del servidor. Por favor intenta nuevamente.");
        setLoading(false);
        return;
      }
      
      if (!res.ok) {
        const errorMessage = typeof data.error === "string" ? data.error : (data.error?.message || "Error al registrarse");
        setMessage(errorMessage);
        setLoading(false);
        return;
      }
      
      // Autologin para obtener token y redirigir
      try {
        const loginRes = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password })
        });
        
        let loginData;
        try {
          loginData = await loginRes.json();
        } catch (parseError) {
          console.error("Error al parsear respuesta de login:", parseError);
          setMessage("Registro exitoso. Por favor inicia sesión manualmente.");
          setLoading(false);
          return;
        }
        
        if (loginRes.ok) {
          setStoredAuth({ token: loginData.token, user: loginData.user });
          if (referralCode) {
            localStorage.removeItem("referralCode");
          }
          const role = loginData.user.role;
          router.push(role === "AGENT" || role === "CONTABLE" || role === "SUPERADMIN" || role === "MASTER" ? "/admin" : "/");
        } else {
          setMessage("Registro exitoso. Inicia sesión para continuar.");
        }
      } catch (loginErr) {
        console.error("Error en autologin:", loginErr);
        setMessage("Registro exitoso. Por favor inicia sesión manualmente.");
      }
    } catch (err) {
      console.error("Error al registrarse:", err);
      const errorMessage = err instanceof Error ? err.message : "Error de conexión. Verifica tu conexión a internet.";
      setMessage(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <main className="container" style={{ paddingTop: "3rem", paddingBottom: "3rem", maxWidth: "520px", minHeight: "calc(100vh - 200px)" }}>
        <div className="card" style={{ display: "grid", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Crear cuenta</h1>
          <form style={{ display: "grid", gap: ".75rem" }} onSubmit={handleSubmit}>
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Nombre completo</span>
              <input
                type="text"
                name="fullName"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ padding: ".75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#F5F5E6", color: "#3E3E3C" }}
              />
            </label>
            
            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Nombre de usuario</span>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  required
                  minLength={5}
                  maxLength={30}
                  pattern="[a-zA-Z0-9]+"
                  value={username}
                  onChange={(e) => {
                    // Solo permitir letras y números
                    const value = e.target.value.replace(/[^a-zA-Z0-9]/g, "");
                    setUsername(value);
                    setUsernameError(null);
                  }}
                  onBlur={() => {
                    if (username.length >= 5) {
                      checkAvailability("username", username);
                    }
                  }}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: checkingUsername ? "2.5rem" : ".75rem",
                    borderRadius: "8px", 
                    border: usernameError ? "2px solid #ef4444" : "1px solid #d4d4c4", 
                    background: "#F5F5E6", 
                    color: "#3E3E3C",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
                {checkingUsername && (
                  <span style={{ 
                    position: "absolute", 
                    right: ".75rem", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    fontSize: ".875rem",
                    color: "#6b7280"
                  }}>
                    ⏳
                  </span>
                )}
              </div>
              {usernameError && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>{usernameError}</small>
              )}
              <small style={{ color: "#6b7280", fontSize: "0.75rem" }}>
                Solo letras y números (sin espacios ni símbolos). Mínimo 5 caracteres.
              </small>
            </label>

            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>ID (Documento)</span>
              <div style={{ display: "grid", gridTemplateColumns: "80px 1fr", gap: "0.5rem", position: "relative" }}>
                <select
                  value={documentIdType}
                  onChange={(e) => {
                    setDocumentIdType(e.target.value as "V" | "E");
                    setDocumentIdError(null);
                  }}
                  style={{
                    padding: ".75rem",
                    borderRadius: "8px",
                    border: documentIdError ? "2px solid #ef4444" : "1px solid #d4d4c4",
                    background: "#F5F5E6",
                    color: "#3E3E3C",
                    fontSize: "1rem",
                    cursor: "pointer"
                  }}
                >
                  <option value="V">V</option>
                  <option value="E">E</option>
                </select>
                <div style={{ position: "relative", width: "100%" }}>
                  <input
                    type="text"
                    name="documentId"
                    autoComplete="off"
                    required
                    value={documentIdNumber}
                    onChange={(e) => {
                      // Solo permitir números
                      const value = e.target.value.replace(/\D/g, "");
                      setDocumentIdNumber(value);
                      setDocumentIdError(null);
                    }}
                    onBlur={() => {
                      if (documentIdNumber) {
                        checkAvailability("documentId", documentId);
                      }
                    }}
                    placeholder="Solo números"
                    style={{ 
                      padding: ".75rem", 
                      paddingRight: checkingDocumentId ? "2.5rem" : ".75rem",
                      borderRadius: "8px", 
                      border: documentIdError ? "2px solid #ef4444" : "1px solid #d4d4c4", 
                      background: "#F5F5E6", 
                      color: "#3E3E3C",
                      width: "100%",
                      boxSizing: "border-box"
                    }}
                  />
                  {checkingDocumentId && (
                    <span style={{ 
                      position: "absolute", 
                      right: ".75rem", 
                      top: "50%", 
                      transform: "translateY(-50%)",
                      fontSize: ".875rem",
                      color: "#6b7280"
                    }}>
                      ⏳
                    </span>
                  )}
                </div>
              </div>
              {documentIdError && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>{documentIdError}</small>
              )}
            </label>

            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Correo</span>
              <div style={{ position: "relative" }}>
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
                    if (email && emailRegex.test(email)) {
                      checkAvailability("email", email);
                    } else if (email) {
                      setEmailError("Formato de correo inválido");
                    }
                  }}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: checkingEmail ? "2.5rem" : ".75rem",
                    borderRadius: "8px", 
                    border: emailError ? "2px solid #ef4444" : "1px solid #d4d4c4", 
                    background: "#F5F5E6", 
                    color: "#3E3E3C",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
                {checkingEmail && (
                  <span style={{ 
                    position: "absolute", 
                    right: ".75rem", 
                    top: "50%", 
                    transform: "translateY(-50%)",
                    fontSize: ".875rem",
                    color: "#6b7280"
                  }}>
                    ⏳
                  </span>
                )}
              </div>
              {emailError && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>{emailError}</small>
              )}
            </label>

            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Contraseña</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    validatePassword(e.target.value);
                  }}
                  onBlur={() => validatePassword(password)}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: "2.5rem",
                    borderRadius: "8px", 
                    border: passwordError ? "2px solid #ef4444" : "1px solid #d4d4c4", 
                    background: "#F5F5E6", 
                    color: "#3E3E3C",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: ".5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: ".25rem",
                    fontSize: "1.25rem",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  tabIndex={-1}
                >
                  {showPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {passwordError && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>{passwordError}</small>
              )}
              {password && (
                <div style={{ display: "grid", gap: ".25rem", fontSize: "0.75rem" }}>
                  <small style={{ color: passwordRequirements.minLength ? "#22c55e" : "#ef4444" }}>
                    {passwordRequirements.minLength ? "✓" : "✗"} Mínimo 8 caracteres
                  </small>
                  <small style={{ color: passwordRequirements.hasNumber ? "#22c55e" : "#ef4444" }}>
                    {passwordRequirements.hasNumber ? "✓" : "✗"} Al menos 1 número
                  </small>
                  <small style={{ color: passwordRequirements.hasSpecial ? "#22c55e" : "#ef4444" }}>
                    {passwordRequirements.hasSpecial ? "✓" : "✗"} Al menos 1 carácter especial (@$!%*?&.)
                  </small>
                </div>
              )}
            </label>

            <label style={{ display: "grid", gap: ".35rem" }}>
              <span>Repetir Contraseña</span>
              <div style={{ position: "relative" }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  autoComplete="new-password"
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onPaste={(e) => {
                    e.preventDefault();
                  }}
                  style={{ 
                    padding: ".75rem", 
                    paddingRight: "2.5rem",
                    borderRadius: "8px", 
                    border: passwordError ? "2px solid #ef4444" : "1px solid #d4d4c4", 
                    background: "#F5F5E6", 
                    color: "#3E3E3C",
                    width: "100%",
                    boxSizing: "border-box"
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: "absolute",
                    right: ".5rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: ".25rem",
                    fontSize: "1.25rem",
                    color: "#6b7280",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? "👁️" : "👁️‍🗨️"}
                </button>
              </div>
              {confirmPasswordError && (
                <small style={{ color: "#ef4444", fontSize: "0.75rem" }}>{confirmPasswordError}</small>
              )}
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
              disabled={!canSubmit || loading} 
              style={{ 
                padding: ".75rem", 
                background: !canSubmit || loading ? "#6b7280" : "#85BB65", 
                color: "#3E3E3C", 
                border: "none", 
                borderRadius: "10px", 
                fontWeight: 700, 
                cursor: !canSubmit || loading ? "not-allowed" : "pointer"
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
