"use client";
import { AuthGuard } from "../../../components/AuthGuard";
import { useEffect, useState, Suspense } from "react";
import { getStoredAuth } from "../../../lib/clientAuth";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getItemWithEmoji } from "../../../lib/raffleEmojis";

type Raffle = {
  id: string;
  title: string;
  type: string;
  pricePerSlot: number;
  prizes: string[];
};

// Componente interno para manejar los search params
function PaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [auth, setAuth] = useState<any>(null);
  const [raffle, setRaffle] = useState<Raffle | null>(null);
  const [items, setItems] = useState<string[]>([]);
  const [total, setTotal] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<"BANESCO" | "BINANCE" | "MOBILE" | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [paymentMobileImage, setPaymentMobileImage] = useState<string | null>(null);
  const [paymentMobileData, setPaymentMobileData] = useState<{ cedula?: string; telefono?: string; destino?: string } | null>(null);
  const [userBankData, setUserBankData] = useState<any>(null);
  const [paymentMobileRef, setPaymentMobileRef] = useState("");
  const [paymentRefUsedByOther, setPaymentRefUsedByOther] = useState(false);
  const [checkingRef, setCheckingRef] = useState(false);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      return;
    }

    const raffleId = searchParams.get("raffleId");
    const itemsParam = searchParams.get("items");
    const totalParam = searchParams.get("total");

    if (!raffleId || !itemsParam || !totalParam) {
      router.push("/");
      return;
    }

    setItems(JSON.parse(decodeURIComponent(itemsParam)));
    setTotal(parseFloat(totalParam));

    // Cargar datos del sorteo
    fetch("/api/raffles")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setLoading(false);
          return;
        }
        const found = Array.isArray(data) ? data.find((r: Raffle) => r.id === raffleId) : null;
        if (found) {
          setRaffle(found);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error al cargar sorteo:", err);
        setLoading(false);
      });

    // Cargar imagen y datos de pago móvil
    fetch("/api/admin/payment-mobile")
      .then((r) => r.json())
      .then((data) => {
        if (data.imageUrl) {
          setPaymentMobileImage(data.imageUrl);
        }
        if (data.cedula || data.telefono || data.destino) {
          setPaymentMobileData({
            cedula: data.cedula,
            telefono: data.telefono,
            destino: data.destino
          });
        }
      })
      .catch(() => {});

    // Cargar datos bancarios del usuario
    if (auth?.token) {
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setUserBankData(data);
          }
        })
        .catch(() => {});
    }
  }, [auth, searchParams, router]);

  async function handlePayment(method: "BANESCO" | "BINANCE" | "MOBILE") {
    if (!auth?.token || !raffle || processing) return;

    if (method === "MOBILE") {
      if (!userBankData || !userBankData.nationalId || !userBankData.bank || !userBankData.phoneNumber) {
        const currentUrl = window.location.href;
        if (confirm("Debes completar tus datos bancarios antes de usar Pago Móvil. ¿Deseas ir a completarlos ahora?")) {
          sessionStorage.setItem("returnUrl", currentUrl);
          window.location.href = "/perfil";
        }
        return;
      }

      const ref = paymentMobileRef.trim();
      if (!ref || ref.length < 6 || ref.length > 12) {
        alert("Debes ingresar la referencia del pago móvil (entre 6 y 12 dígitos)");
        return;
      }
      if (paymentRefUsedByOther) {
        alert("Esta referencia ya se registro.");
        return;
      }
    }

    setPaymentMethod(method);
    setProcessing(true);

    try {
      if (method === "MOBILE") {
        const res = await fetch(`/api/raffles/${raffle.id}/buy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            items: items,
            paymentMethod: "MOBILE",
            paymentMobileRef: paymentMobileRef.trim(),
            paymentMobileBank: userBankData.bank
          })
        });

        if (res.ok) {
          alert("Cupos reservados. Un administrador revisará tu pago y confirmará los cupos.");
          router.push("/dashboard");
        } else {
          const error = await res.json();
          alert(error.error || "Error al procesar el pago");
          setProcessing(false);
        }
      } else {
        const res = await fetch(`/api/raffles/${raffle.id}/buy`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${auth.token}`
          },
          body: JSON.stringify({
            items: items,
            paymentMethod: method
          })
        });

        if (res.ok) {
          const data = await res.json();
          window.open(`/api/tickets/${data.ticketId}/pdf`, "_blank");
          alert("¡Pago exitoso! El ticket se está generando.");
          router.push("/dashboard");
        } else {
          const error = await res.json();
          alert(error.error || "Error al procesar el pago");
          setProcessing(false);
        }
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al procesar el pago");
      setProcessing(false);
    }
  }

  async function checkPaymentRefOnBlur() {
    const ref = paymentMobileRef.trim();
    const bank = userBankData?.bank;
    if (ref.length < 6 || !bank || !auth?.token) return;
    setCheckingRef(true);
    setPaymentRefUsedByOther(false);
    try {
      const res = await fetch(
        `/api/user/check-payment-ref?ref=${encodeURIComponent(ref)}&bank=${encodeURIComponent(bank)}`,
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      const data = await res.json();
      if (res.ok && data.used === true) {
        setPaymentRefUsedByOther(true);
      }
    } catch {
      // Silenciar error de red; el servidor validará al enviar
    } finally {
      setCheckingRef(false);
    }
  }

  function getTypeLabel(type: string): string {
    const labels: Record<string, string> = {
      NUMBERS: "NÚMEROS",
      ANIMALS: "ANIMALES",
      STATES: "ESTADOS",
      FLAGS: "BANDERAS",
      ZODIAC: "SIGNOS ZODIACALES"
    };
    return labels[type] || type.toUpperCase();
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

  if (!raffle) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            Sorteo no encontrado
          </div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <>
        <main className="container" style={{ paddingTop: "2rem", maxWidth: "800px" }}>
          <div style={{ marginBottom: "1.5rem" }}>
            <Link href={`/raffles/${raffle.id}`} style={{ color: "#85BB65", textDecoration: "none" }}>
              ← Volver
            </Link>
          </div>

          <h1>Método de Pago</h1>

          <div className="card" style={{ padding: "1.5rem", marginBottom: "1.5rem", display: "grid", gap: "1rem" }}>
            <h2 style={{ margin: 0 }}>{raffle.title}</h2>
            <div style={{ display: "grid", gap: ".5rem", fontSize: ".875rem", color: "#94a3b8" }}>
              <div><strong>Tipo:</strong> {getTypeLabel(raffle.type)}</div>
              <div><strong>Cupos seleccionados:</strong> {items.map(item => getItemWithEmoji(item, raffle?.type || "")).join(", ")}</div>
              <div><strong>Total a pagar:</strong> <span style={{ color: "#228D57", fontSize: "1.25rem", fontWeight: 700 }}>Bs. {total.toFixed(2)}</span></div>
            </div>
          </div>

          <div className="card" style={{ padding: "1.5rem", display: "grid", gap: "1.5rem" }}>
            <h2 style={{ margin: 0 }}>Selecciona tu método de pago</h2>

            <div style={{ position: "relative" }}>
              <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", background: "#6b7280", color: "#fff", padding: "0.25rem 0.75rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: 700, zIndex: 1 }}>
                PRÓXIMAMENTE
              </div>
              <button
                disabled={true}
                style={{
                  padding: "1.5rem",
                  background: "#9ca3af",
                  border: "1px solid #6b7280",
                  borderRadius: "10px",
                  color: "#6b7280",
                  cursor: "not-allowed",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  opacity: 0.6
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: ".5rem", color: "#6b7280" }}>Binance USDT</div>
                  <div style={{ fontSize: ".875rem", color: "#6b7280", opacity: 0.8 }}>Pago con criptomonedas USDT</div>
                </div>
                <div style={{ fontSize: "1.5rem" }}>₿</div>
              </button>
            </div>

            <div>
              <button
                onClick={() => setPaymentMethod(paymentMethod === "MOBILE" ? null : "MOBILE")}
                disabled={processing}
                style={{
                  width: "100%",
                  padding: "1.5rem",
                  background: "#f5f5e6",
                  border: paymentMethod === "MOBILE" ? "2px solid #f59e0b" : "1px solid #d4d4c4",
                  borderRadius: "10px",
                  color: "#3E3E3C",
                  cursor: processing ? "not-allowed" : "pointer",
                  textAlign: "left",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: paymentMethod === "MOBILE" ? "1rem" : "0"
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.125rem", marginBottom: ".5rem", color: "#3E3E3C" }}>Pago Móvil</div>
                  <div style={{ fontSize: ".875rem", color: "#3E3E3C", opacity: 0.8 }}>Realiza tu pago con Pago Móvil de manera rápida y eficaz</div>
                </div>
                <div style={{ fontSize: "1.5rem" }}>📱</div>
              </button>

              {paymentMethod === "MOBILE" && (
                <div style={{ padding: "1.5rem", background: "#f5f5e6", borderRadius: "10px", border: "1px solid #d4d4c4", marginTop: "1rem", display: "grid", gap: "1rem" }}>
                  {!userBankData || !userBankData.nationalId || !userBankData.bank || !userBankData.phoneNumber ? (
                    <div style={{ padding: "1rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px solid #f59e0b", color: "#f59e0b" }}>
                      <p style={{ margin: "0 0 .5rem", fontWeight: 600 }}>⚠️ Datos bancarios incompletos</p>
                      <p style={{ margin: 0, fontSize: ".875rem" }}>
                        Debes completar tus datos bancarios (Cédula, Banco, Teléfono) antes de usar Pago Móvil.
                      </p>
                      <Link
                        href="/perfil"
                        onClick={() => {
                          sessionStorage.setItem("returnUrl", window.location.href);
                        }}
                        style={{
                          marginTop: ".75rem",
                          padding: ".5rem 1rem",
                          background: "#f59e0b",
                          color: "#3E3E3C",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: 700,
                          cursor: "pointer",
                          textDecoration: "none",
                          display: "inline-block"
                        }}
                      >
                        Completar Datos Bancarios
                      </Link>
                    </div>
                  ) : (
                    <>
                      {paymentMobileImage && (
                        <div style={{ marginBottom: "1rem" }}>
                          <img 
                            src={paymentMobileImage} 
                            alt="Información de Pago Móvil" 
                            style={{ width: "100%", maxWidth: "300px", borderRadius: "8px", margin: "0 auto", display: "block" }}
                          />
                        </div>
                      )}

                      {paymentMobileData && (paymentMobileData.cedula || paymentMobileData.telefono || paymentMobileData.destino) && (
                        <div style={{ padding: "1rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", border: "1px solid #85BB65", marginBottom: "1rem" }}>
                          <div style={{ marginBottom: ".75rem", fontWeight: 700, color: "#3E3E3C", fontSize: ".875rem" }}>
                            📋 Datos para Copiar y Pegar:
                          </div>
                          <div style={{ display: "grid", gap: ".5rem", fontSize: ".875rem" }}>
                            {paymentMobileData.cedula && (
                              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <strong style={{ color: "#3E3E3C", minWidth: "90px" }}>CÉDULA:</strong>
                                <span
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.cedula!);
                                    alert("Cédula copiada al portapapeles");
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: ".5rem",
                                    background: "#fff",
                                    borderRadius: "4px",
                                    border: "1px solid #d4d4c4",
                                    cursor: "pointer",
                                    userSelect: "all",
                                    color: "#3E3E3C"
                                  }}
                                >
                                  {paymentMobileData.cedula}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.cedula!);
                                    alert("Cédula copiada al portapapeles");
                                  }}
                                  style={{
                                    padding: ".5rem",
                                    background: "#85BB65",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: ".75rem"
                                  }}
                                >
                                  📋
                                </button>
                              </div>
                            )}
                            {paymentMobileData.destino && (
                              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <strong style={{ color: "#3E3E3C", minWidth: "90px" }}>BANCO:</strong>
                                <span
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.destino!);
                                    alert("Banco copiado al portapapeles");
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: ".5rem",
                                    background: "#fff",
                                    borderRadius: "4px",
                                    border: "1px solid #d4d4c4",
                                    cursor: "pointer",
                                    userSelect: "all",
                                    color: "#3E3E3C"
                                  }}
                                >
                                  {paymentMobileData.destino}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.destino!);
                                    alert("Banco copiado al portapapeles");
                                  }}
                                  style={{
                                    padding: ".5rem",
                                    background: "#85BB65",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: ".75rem"
                                  }}
                                >
                                  📋
                                </button>
                              </div>
                            )}
                            {paymentMobileData.telefono && (
                              <div style={{ display: "flex", alignItems: "center", gap: ".5rem" }}>
                                <strong style={{ color: "#3E3E3C", minWidth: "90px" }}>TELÉFONO:</strong>
                                <span
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.telefono!);
                                    alert("Teléfono copiado al portapapeles");
                                  }}
                                  style={{
                                    flex: 1,
                                    padding: ".5rem",
                                    background: "#fff",
                                    borderRadius: "4px",
                                    border: "1px solid #d4d4c4",
                                    cursor: "pointer",
                                    userSelect: "all",
                                    color: "#3E3E3C"
                                  }}
                                >
                                  {paymentMobileData.telefono}
                                </span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(paymentMobileData.telefono!);
                                    alert("Teléfono copiado al portapapeles");
                                  }}
                                  style={{
                                    padding: ".5rem",
                                    background: "#85BB65",
                                    color: "#fff",
                                    border: "none",
                                    borderRadius: "4px",
                                    cursor: "pointer",
                                    fontSize: ".75rem"
                                  }}
                                >
                                  📋
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      <div style={{ display: "grid", gap: ".75rem" }}>
                        <div>
                          <label style={{ display: "block", marginBottom: ".5rem", color: "#3E3E3C", fontWeight: 600, fontSize: ".875rem" }}>
                            Referencia del Pago Móvil (6 a 12 dígitos) *
                          </label>
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            value={paymentMobileRef}
                            onChange={(e) => {
                              const value = e.target.value.replace(/\D/g, "");
                              if (value.length <= 12) {
                                setPaymentMobileRef(value);
                                setPaymentRefUsedByOther(false);
                              }
                            }}
                            onBlur={checkPaymentRefOnBlur}
                            placeholder="Mínimo 6, máximo 12 dígitos"
                            maxLength={12}
                            style={{
                              width: "100%",
                              padding: ".75rem",
                              borderRadius: "8px",
                              border: paymentRefUsedByOther ? "2px solid #ef4444" : "1px solid #d4d4c4",
                              background: "#F5F5E6",
                              color: "#3E3E3C",
                              fontSize: "1rem",
                              textAlign: "center",
                              letterSpacing: "0.25rem"
                            }}
                          />
                          {checkingRef && (
                            <div style={{ marginTop: ".5rem", fontSize: ".75rem", color: "var(--text-secondary)" }}>
                              Comprobando referencia...
                            </div>
                          )}
                          {paymentRefUsedByOther && (
                            <div style={{ marginTop: ".5rem", fontSize: ".875rem", color: "#ef4444", fontWeight: 600 }}>
                              Esta referencia ya se registro.
                            </div>
                          )}
                          {paymentMobileRef.length > 0 && paymentMobileRef.length < 6 && !paymentRefUsedByOther && (
                            <div style={{ marginTop: ".5rem", fontSize: ".75rem", color: "#f59e0b" }}>
                              Mínimo 6 dígitos (faltan {6 - paymentMobileRef.length})
                            </div>
                          )}
                          {paymentMobileRef.length >= 6 && paymentMobileRef.length <= 12 && !paymentRefUsedByOther && !checkingRef && (
                            <div style={{ marginTop: ".5rem", fontSize: ".75rem", color: "#228D57" }}>
                              {paymentMobileRef.length}/12 dígitos
                            </div>
                          )}
                        </div>
                        
                        <div style={{ padding: "1rem", background: "rgba(239, 68, 68, 0.1)", border: "2px solid #ef4444", borderRadius: "8px", marginBottom: "1rem" }}>
                          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase", marginBottom: "0.5rem" }}>
                            ⚠️ IMPORTANTE
                          </div>
                          <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "0.875rem", textTransform: "uppercase" }}>
                            LOS MISMOS DATOS BANCARIOS INGRESADOS SE UTILIZARÁN PARA REALIZAR EL PAGO EN CASO DE SER GANADORES DE ALGUNO DE LOS SORTEOS.
                          </div>
                        </div>

                        <div style={{ padding: ".75rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", fontSize: ".875rem", color: "#3E3E3C" }}>
                          <div><strong>Datos registrados:</strong></div>
                          <div>Cédula: {userBankData.nationalId}</div>
                          <div>Banco: {userBankData.bank}</div>
                          <div>Teléfono: {userBankData.phoneNumber}</div>
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handlePayment("MOBILE")}
                        disabled={
                          processing ||
                          paymentMobileRef.trim().length < 6 ||
                          paymentMobileRef.trim().length > 12 ||
                          paymentRefUsedByOther
                        }
                        style={{
                          width: "100%",
                          padding: ".75rem 1.5rem",
                          background:
                            processing || paymentMobileRef.trim().length < 6 || paymentMobileRef.trim().length > 12 || paymentRefUsedByOther
                              ? "#6b7280"
                              : "#f59e0b",
                          color: "#3E3E3C",
                          border: "none",
                          borderRadius: "8px",
                          fontWeight: 700,
                          fontSize: "1.125rem",
                          cursor:
                            processing || paymentMobileRef.trim().length < 6 || paymentMobileRef.trim().length > 12 || paymentRefUsedByOther
                              ? "not-allowed"
                              : "pointer"
                        }}
                      >
                        {processing ? "Procesando..." : "Confirmar Pago Móvil"}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </main>
      </>
    </AuthGuard>
  );
}

// Componente wrapper para Suspense
export default function PaymentPage() {
  return (
    <Suspense fallback={
      <AuthGuard requiredRole={["USER"]}>
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    }>
      <PaymentContent />
    </Suspense>
  );
}
