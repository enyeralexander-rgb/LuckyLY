"use client";
import { AdminNavBar } from "../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";
import { formatBankDisplay } from "../../../../lib/banks";

type Claim = {
  id: string;
  status: string;
  createdAt: string;
  paymentRef: string | null;
  paymentProof: string | null;
  suggestedPrize?: number;
  ticket: {
    id: string;
    totalPaid: number;
    paymentMethod: string | null;
    paymentMobileRef: string | null;
    raffle: { title: string; winningItem: string | null };
  };
  user: {
    name: string;
    email: string;
    nationalId: string | null;
    phoneNumber: string | null;
    bank: string | null;
    bankPhone: string | null;
  };
};

const defaultEmailBody = `¡Felicidades, {{userName}}! 🌟
Ganaste en LuckyLY. Te envío adjunto el comprobante de pago de tu premio.
¡Gracias por confiar en nosotros, por ser parte de nuestra comunidad y a disfrutarlo! 🥳
Sorteo: {{raffleTitle}}`;

function PagosPageContent() {
  const auth = getStoredAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [payModalClaim, setPayModalClaim] = useState<Claim | null>(null);
  const [payRef, setPayRef] = useState("");
  const [payFile, setPayFile] = useState<File | null>(null);
  const [emailTemplateModal, setEmailTemplateModal] = useState(false);
  const [emailTemplateBody, setEmailTemplateBody] = useState(defaultEmailBody);
  const [emailTemplateSaving, setEmailTemplateSaving] = useState(false);

  useEffect(() => {
    if (auth?.token) {
      fetch("/api/admin/claims", { headers: { Authorization: `Bearer ${auth.token}` }, cache: "no-store" })
        .then((r) => r.json())
        .then((data) => {
          setClaims(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  async function handleOpenPayModal(claim: Claim) {
    setPayModalClaim(claim);
    setPayRef("");
    setPayFile(null);
  }

  async function handleSubmitPay() {
    if (!auth?.token || !payModalClaim) return;
    const amount = payModalClaim.suggestedPrize != null ? payModalClaim.suggestedPrize : Number(payModalClaim.ticket.totalPaid);
    if (!payRef.trim()) {
      alert("Ingresa la referencia de pago");
      return;
    }
    if (!payFile) {
      alert("Selecciona el comprobante de pago (imagen) para enviarlo por correo al ganador");
      return;
    }
    setProcessing(payModalClaim.id);
    try {
      const formData = new FormData();
      formData.append("paymentRef", payRef.trim());
      formData.append("paidAmount", String(amount));
      formData.append("file", payFile);

      const res = await fetch(`/api/admin/claims/${payModalClaim.id}/pay`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        alert("Reclamo marcado como pagado. El cliente recibirá un email con el comprobante.");
        setPayModalClaim(null);
        window.location.reload();
      } else {
        alert(data.error || "No se pudo procesar el pago");
      }
    } catch {
      alert("Error al procesar pago");
    } finally {
      setProcessing(null);
    }
  }

  function openEmailTemplateModal() {
    setEmailTemplateModal(true);
    fetch("/api/admin/prize-email-template", { headers: { Authorization: `Bearer ${auth?.token}` } })
      .then((r) => r.json())
      .then((data) => setEmailTemplateBody(data.body || defaultEmailBody))
      .catch(() => setEmailTemplateBody(defaultEmailBody));
  }

  async function saveEmailTemplate() {
    if (!auth?.token) return;
    setEmailTemplateSaving(true);
    try {
      const res = await fetch("/api/admin/prize-email-template", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ body: emailTemplateBody }),
      });
      if (res.ok) {
        alert("Texto de email guardado");
        setEmailTemplateModal(false);
      } else {
        const data = await res.json();
        alert(data.error || "Error al guardar");
      }
    } catch {
      alert("Error al guardar");
    } finally {
      setEmailTemplateSaving(false);
    }
  }

  async function handleIncorrectData(claimId: string) {
    if (!auth?.token || !confirm("¿Marcar este reclamo como 'Datos Incorrectos'? Se enviará una notificación y email al usuario.")) return;
    setProcessing(claimId);
    try {
      const res = await fetch(`/api/admin/claims/${claimId}/incorrect-data`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        alert("Se ha marcado el reclamo como 'Datos Incorrectos'. El usuario recibirá una notificación y email.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo procesar"}`);
      }
    } catch {
      alert("Error al procesar");
    } finally {
      setProcessing(null);
    }
  }

  const pending = claims.filter((c) => c.status === "REQUESTED" || c.status === "PROCESSING");

  const modalOverlayStyle: React.CSSProperties = {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "1rem",
  };
  const modalCardStyle: React.CSSProperties = {
    background: "var(--bg-primary)",
    borderRadius: "12px",
    padding: "1.5rem",
    maxWidth: "480px",
    width: "100%",
    maxHeight: "90vh",
    overflow: "auto",
    boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
  };

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Gestión de Pagos de Premios</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={openEmailTemplateModal}
              style={{
                padding: "0.5rem 1rem",
                background: "#6366f1",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                fontWeight: 600,
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              ✉️ Configurar texto de email a ganadores
            </button>
            <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
          </div>
        </div>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : pending.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay reclamos pendientes
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pending.map((claim) => (
              <div key={claim.id} className="card" style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{claim.user.name}</h3>
                    <p style={{ margin: ".25rem 0", color: "var(--text-secondary)" }}>
                      {claim.user.email} | Sorteo: {claim.ticket.raffle.title}
                    </p>
                    <p style={{ margin: ".25rem 0", color: "var(--text-secondary)" }}>
                      Ganador: {claim.ticket.raffle.winningItem || "N/A"} | Premio: {(claim.suggestedPrize != null ? claim.suggestedPrize : Number(claim.ticket.totalPaid)).toFixed(2)} Bs.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleOpenPayModal(claim)}
                      disabled={processing === claim.id}
                      style={{
                        padding: ".5rem 1rem",
                        background: "#85BB65",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: processing === claim.id ? "not-allowed" : "pointer",
                        fontWeight: 700,
                      }}
                    >
                      {processing === claim.id ? "Procesando..." : "Marcar Pagado"}
                    </button>
                    <button
                      onClick={() => handleIncorrectData(claim.id)}
                      disabled={processing === claim.id}
                      style={{
                        padding: ".5rem 1rem",
                        background: "#f59e0b",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: processing === claim.id ? "not-allowed" : "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Datos Incorrectos
                    </button>
                  </div>
                </div>
                <div className="card" style={{ background: "#1f2937", padding: "1rem", display: "grid", gap: "1rem" }}>
                  <div>
                    <h4 style={{ margin: "0 0 .5rem", fontSize: ".875rem" }}>Datos Bancarios:</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: ".5rem", fontSize: ".875rem" }}>
                      <div>
                        <strong>Banco:</strong> {claim.user.bank ? formatBankDisplay(claim.user.bank) : "No especificado"}
                      </div>
                      <div>
                        <strong>Cédula:</strong> {claim.user.nationalId || "No especificada"}
                      </div>
                      <div>
                        <strong>Teléfono:</strong> {claim.user.phoneNumber || "No especificado"}
                      </div>
                      <div>
                        <strong>Teléfono Banco:</strong> {claim.user.bankPhone || "No especificado"}
                      </div>
                    </div>
                  </div>
                  {claim.ticket.paymentMethod === "MOBILE" && claim.ticket.paymentMobileRef && (
                    <div style={{ padding: ".75rem", background: "rgba(245, 158, 11, 0.1)", borderRadius: "8px", border: "1px solid #f59e0b" }}>
                      <h4 style={{ margin: "0 0 .5rem", fontSize: ".875rem", color: "#f59e0b" }}>Referencia de Pago Móvil (Compra):</h4>
                      <div style={{ fontSize: ".875rem", color: "#e2e8f0", fontWeight: 600 }}>
                        {claim.ticket.paymentMobileRef}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {payModalClaim && (
        <div style={modalOverlayStyle} onClick={() => !processing && setPayModalClaim(null)}>
          <div style={modalCardStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 1rem" }}>Marcar como pagado</h3>
            <p style={{ margin: "0 0 .5rem", color: "var(--text-secondary)", fontSize: ".875rem" }}>
              Sorteo: {payModalClaim.ticket.raffle.title} | Monto: {(payModalClaim.suggestedPrize != null ? payModalClaim.suggestedPrize : Number(payModalClaim.ticket.totalPaid)).toFixed(2)} Bs.
            </p>
            <div style={{ display: "grid", gap: "1rem", marginBottom: "1rem" }}>
              <div>
                <label style={{ display: "block", marginBottom: ".25rem", fontWeight: 600 }}>Referencia de pago *</label>
                <input
                  type="text"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                  placeholder="Ej: 01234567890123456789"
                  style={{ width: "100%", padding: ".5rem .75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)" }}
                />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: ".25rem", fontWeight: 600 }}>Comprobante de pago (imagen) *</label>
                <p style={{ margin: "0 0 .5rem", fontSize: ".75rem", color: "var(--text-secondary)" }}>Se enviará por correo al ganador. No se guarda en la base de datos.</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPayFile(e.target.files?.[0] ?? null)}
                  style={{ width: "100%", padding: ".5rem", borderRadius: "8px", border: "1px solid var(--border-color)" }}
                />
              </div>
            </div>
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setPayModalClaim(null)} disabled={!!processing} style={{ padding: ".5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "8px", cursor: processing ? "not-allowed" : "pointer" }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmitPay} disabled={!!processing || !payRef.trim() || !payFile} style={{ padding: ".5rem 1rem", background: "#85BB65", color: "#fff", border: "none", borderRadius: "8px", cursor: !!processing || !payRef.trim() || !payFile ? "not-allowed" : "pointer", fontWeight: 600 }}>
                {processing ? "Procesando..." : "Confirmar y enviar email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {emailTemplateModal && (
        <div style={modalOverlayStyle} onClick={() => !emailTemplateSaving && setEmailTemplateModal(false)}>
          <div style={{ ...modalCardStyle, maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 0.5rem" }}>Texto del email a ganadores</h3>
            <p style={{ margin: "0 0 1rem", fontSize: ".875rem", color: "var(--text-secondary)" }}>
              Usa <code style={{ background: "var(--bg-secondary)", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{`{{userName}}`}</code> y <code style={{ background: "var(--bg-secondary)", padding: "0.1rem 0.3rem", borderRadius: "4px" }}>{`{{raffleTitle}}`}</code> como placeholders.
            </p>
            <textarea
              value={emailTemplateBody}
              onChange={(e) => setEmailTemplateBody(e.target.value)}
              rows={12}
              style={{ width: "100%", padding: ".75rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--input-bg)", color: "var(--text-primary)", fontFamily: "inherit", marginBottom: "1rem" }}
            />
            <div style={{ display: "flex", gap: ".5rem", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setEmailTemplateModal(false)} disabled={emailTemplateSaving} style={{ padding: ".5rem 1rem", background: "#6b7280", color: "#fff", border: "none", borderRadius: "8px", cursor: emailTemplateSaving ? "not-allowed" : "pointer" }}>
                Cerrar
              </button>
              <button type="button" onClick={saveEmailTemplate} disabled={emailTemplateSaving} style={{ padding: ".5rem 1rem", background: "#85BB65", color: "#fff", border: "none", borderRadius: "8px", cursor: emailTemplateSaving ? "not-allowed" : "pointer", fontWeight: 600 }}>
                {emailTemplateSaving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function PagosPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"]}>
      <PagosPageContent />
    </AuthGuard>
  );
}
