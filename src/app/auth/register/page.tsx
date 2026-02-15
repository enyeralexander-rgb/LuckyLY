"use client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";
import { setStoredAuth } from "../../../lib/clientAuth";
import { Footer } from "../../../components/Footer";
import { VENEZUELAN_BANKS } from "../../../lib/banks";
import { useTutorial } from "../../../contexts/TutorialContext";
import { setTutorialDone } from "../../../lib/tutorialCookie";

function RegisterPageContent() {
  const tutorial = useTutorial();
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
  const [step, setStep] = useState<1 | 2>(1);
  const [bank, setBank] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  
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

  // Avanzar tutorial al paso 5 cuando el formulario pasa al paso 2 (después del render para que exista data-tutorial-step2-form)
  useEffect(() => {
    if (step === 2 && tutorial?.active && tutorial?.step === 4) {
      tutorial.nextStep();
    }
  }, [step, tutorial?.active, tutorial?.step]);

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

  // Validar si el paso 1 puede continuar (sin términos; los términos van en paso 2)
  const canSubmitStep1 =
    name.length >= 3 &&
    username.length >= 5 &&
    /^[a-zA-Z0-9]+$/.test(username) &&
    documentIdNumber.length > 0 &&
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email) &&
    password.length >= 8 &&
    /\d/.test(password) &&
    /[@$!%*?&.]/.test(password) &&
    passwordsMatch &&
    !usernameError &&
    !emailError &&
    !documentIdError &&
    !passwordError &&
    !checkingUsername &&
    !checkingEmail &&
    !checkingDocumentId;

  const phoneDigits = phoneNumber.replace(/\D/g, "");
  const canSubmitStep2 =
    bank.trim() !== "" &&
    phoneDigits.length >= 11 &&
    acceptTerms;

  function handleStep1Submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!canSubmitStep1) return;
    if (!passwordsMatch) {
      setMessage("Las contraseñas no coinciden");
      return;
    }
    setStep(2);
  }

  async function handleStep2Submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!acceptTerms) {
      setMessage("Debes aceptar los términos y condiciones para registrarte");
      return;
    }
    if (!canSubmitStep2) {
      if (phoneDigits.length > 0 && phoneDigits.length < 11) {
        setMessage("El teléfono debe tener al menos 11 dígitos.");
      } else if (!bank.trim()) {
        setMessage("Selecciona un banco.");
      }
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
          documentId,
          email,
          password,
          acceptTerms: true,
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
          setTimeout(() => router.push("/auth/login"), 2000);
          return;
        }

        if (loginRes.ok && loginData.token && loginData.user) {
          setStoredAuth({ token: loginData.token, user: loginData.user });

          const role = String(loginData.user?.role ?? "USER").toUpperCase();
          const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(role);
          if (typeof document !== "undefined" && !isAdmin) {
            document.cookie = "just_registred=1; path=/; max-age=120; SameSite=Lax";
          }

          const profileRes = await fetch("/api/user/profile", {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${loginData.token}`
            },
            credentials: "same-origin",
            body: JSON.stringify({ bank: bank.trim(), phoneNumber: phoneDigits })
          });

          if (!profileRes.ok) {
            const profileErr = await profileRes.json().catch(() => ({}));
            console.error("Error al guardar datos bancarios:", profileErr);
            setMessage(profileErr?.error || "Cuenta creada. Completa tus datos bancarios en Mi Cuenta.");
          }

          if (referralCode) localStorage.removeItem("referralCode");
          setMessage("✅ Registro exitoso. Redirigiendo...");

          const redirectUrl = isAdmin ? "/admin" : "/cuenta/configuracion";
          setTimeout(() => {
            setTutorialDone();
            window.location.href = redirectUrl;
          }, 1000);
        } else {
          setMessage("Registro exitoso. Inicia sesión para continuar.");
          setLoading(false);
          setTimeout(() => router.push("/auth/login"), 2000);
        }
      } catch (loginErr) {
        console.error("Error en autologin:", loginErr);
        setMessage("Registro exitoso. Por favor inicia sesión manualmente.");
        setLoading(false);
        setTimeout(() => router.push("/auth/login"), 2000);
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <h1 style={{ margin: 0 }}>Crear cuenta</h1>
            <span style={{ fontSize: "0.875rem", color: "#6b7280", fontWeight: 600 }}>Paso {step} de 2</span>
          </div>

          {step === 1 && (
          <form style={{ display: "grid", gap: ".75rem" }} onSubmit={handleStep1Submit}>
            <div style={{ display: "grid", gap: ".75rem" }} data-tutorial-form>
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
            </div>

            <button
              type="submit"
              disabled={!canSubmitStep1}
              data-tutorial-submit
              className={tutorial?.step === 4 ? "tutorial-highlight-submit" : undefined}
              style={{
                padding: ".75rem",
                background: !canSubmitStep1 ? "#6b7280" : "#85BB65",
                color: "#3E3E3C",
                border: "none",
                borderRadius: "10px",
                fontWeight: 700,
                cursor: !canSubmitStep1 ? "not-allowed" : "pointer"
              }}
            >
              Siguiente
            </button>
          </form>
          )}

          {step === 2 && (
          <form style={{ display: "grid", gap: "1rem" }} onSubmit={handleStep2Submit}>
            <div data-tutorial-step2-form style={{ display: "grid", gap: "1rem" }}>
            <p style={{ margin: 0, fontSize: "0.9375rem", color: "var(--text-secondary, #6b7280)", lineHeight: 1.4 }}>
              Indica los datos de tu Pago Móvil donde serán transferidos los premios de las ruletas.
            </p>
            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Documento de Identidad *
              </label>
              <input
                type="text"
                value={documentId}
                readOnly
                disabled
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-disabled-bg, #e5e5e5)",
                  color: "var(--text-secondary, #6b7280)",
                  fontSize: "1rem",
                  cursor: "not-allowed"
                }}
              />
              <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                Este dato no se puede modificar. Fue ingresado en el paso anterior.
              </small>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Banco *
              </label>
              <select
                value={bank}
                onChange={(e) => setBank(e.target.value)}
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg, #F5F5E6)",
                  color: "var(--text-primary)",
                  fontSize: "1rem"
                }}
              >
                <option value="">Selecciona un banco</option>
                {VENEZUELAN_BANKS.map((b) => (
                  <option key={b.code} value={b.enumValue}>
                    ({b.code}) {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="phone-register" style={{ display: "block", marginBottom: ".5rem", color: "var(--text-primary)", fontWeight: 600 }}>
                Teléfono (Pago Móvil) *
              </label>
              <input
                id="phone-register"
                type="tel"
                inputMode="numeric"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej: 04121234567 (mín. 11 dígitos)"
                style={{
                  width: "100%",
                  padding: ".75rem",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--input-bg, #F5F5E6)",
                  color: "var(--text-primary)",
                  fontSize: "1rem"
                }}
              />
              <small style={{ color: "var(--text-secondary)", fontSize: "0.75rem", marginTop: "0.25rem", display: "block" }}>
                Solo números (sin guiones ni espacios)
              </small>
            </div>

            <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "2px solid #ef4444", borderRadius: "8px" }}>
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                ⚠️ IMPORTANTE
              </div>
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase" }}>
                LOS MISMOS DATOS BANCARIOS INGRESADOS SE UTILIZARÁN PARA REALIZAR EL PAGO EN CASO DE SER GANADORES DE ALGUNO DE LOS SORTEOS.
              </div>
            </div>

            <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.1)", border: "2px solid #f59e0b", borderRadius: "8px" }}>
              <div style={{ color: "#d97706", fontWeight: 700, fontSize: "0.875rem", marginBottom: "0.5rem" }}>
                📅 RESTRICCIÓN DE MODIFICACIÓN
              </div>
              <div style={{ color: "#d97706", fontSize: "0.875rem" }}>
                Una vez que guardes tus datos bancarios, solo podrás modificarlos <strong>1 vez por semana</strong>.
                Asegúrate de ingresar la información correcta antes de continuar.
              </div>
            </div>

            <label style={{ display: "flex", gap: ".5rem", alignItems: "start", cursor: "pointer" }} data-tutorial-terms>
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
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  width: "100%",
                  padding: ".75rem 1.25rem",
                  background: "transparent",
                  color: "#85BB65",
                  border: "2px solid #85BB65",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: "pointer"
                }}
              >
                ← Ir atrás
              </button>
              <button
                type="submit"
                disabled={!canSubmitStep2 || loading}
                data-tutorial-register-btn
                className={tutorial?.step === 7 ? "tutorial-highlight-submit" : undefined}
                style={{
                  width: "100%",
                  padding: ".75rem 1.25rem",
                  background: !canSubmitStep2 || loading ? "#6b7280" : "#85BB65",
                  color: "#3E3E3C",
                  border: "none",
                  borderRadius: "10px",
                  fontWeight: 700,
                  cursor: !canSubmitStep2 || loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "Registrando..." : "Registrarme"}
              </button>
            </div>
          </form>
          )}
          {message && <p style={{ color: "#f97316", margin: 0 }}>{message}</p>}
        </div>
        <p style={{ marginTop: "1rem", marginBottom: 0, textAlign: "center" }}>
          <Link href="/auth/login" style={{ color: "#85BB65" }}>¿Ya tienes cuenta? Inicia sesión</Link>
        </p>
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
