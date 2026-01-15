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

function PagosPageContent() {
  const auth = getStoredAuth();
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [uploadingProof, setUploadingProof] = useState<string | null>(null);

  useEffect(() => {
    if (auth?.token) {
      fetch("/api/admin/claims", { headers: { Authorization: `Bearer ${auth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          setClaims(data);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [auth]);

  async function handleUploadProof(claimId: string) {
    if (!auth?.token) return;
    
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingProof(claimId);
      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(`/api/admin/claims/${claimId}/upload-proof`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` },
          body: formData,
        });

        const data = await res.json();
        if (res.ok) {
          alert("Comprobante subido exitosamente");
          window.location.reload();
        } else {
          alert(`Error: ${data.error || "No se pudo subir el comprobante"}`);
        }
      } catch (err) {
        console.error("Error:", err);
        alert("Error al subir comprobante");
      } finally {
        setUploadingProof(null);
      }
    };
    input.click();
  }

  async function handleMarkPaid(claimId: string) {
    if (!auth?.token) return;
    
    const claim = claims.find((c) => c.id === claimId);
    if (!claim) return;

    if (!claim.paymentProof) {
      alert("Debe adjuntar un comprobante de pago antes de confirmar el pago");
      return;
    }

    if (!confirm("¿Marcar este reclamo como pagado?")) return;
    setProcessing(claimId);
    try {
      const paymentRef = prompt("Ingresa la referencia de pago:");
      if (!paymentRef) {
        setProcessing(null);
        return;
      }
      const res = await fetch(`/api/admin/claims/${claimId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.token}` },
        body: JSON.stringify({ paymentRef })
      });
      if (res.ok) {
        alert("Reclamo marcado como pagado. El cliente recibirá un email con el comprobante.");
        window.location.reload();
      } else {
        const data = await res.json();
        alert(`Error: ${data.error || "No se pudo procesar el pago"}`);
      }
    } catch {
      alert("Error al procesar pago");
    } finally {
      setProcessing(null);
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

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <h1 style={{ margin: 0 }}>Gestión de Pagos de Premios</h1>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <Link href="/admin" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver</Link>
          </div>
        </div>
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : pending.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            No hay reclamos pendientes
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pending.map((claim) => (
              <div key={claim.id} className="card" style={{ display: "grid", gap: "1rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{claim.user.name}</h3>
                    <p style={{ margin: ".25rem 0", color: "#94a3b8" }}>
                      {claim.user.email} | Sorteo: {claim.ticket.raffle.title}
                    </p>
                    <p style={{ margin: ".25rem 0", color: "#94a3b8" }}>
                      Ganador: {claim.ticket.raffle.winningItem || "N/A"} | Monto: {Number(claim.ticket.totalPaid).toFixed(2)} Bs.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <button
                      onClick={() => handleUploadProof(claim.id)}
                      disabled={uploadingProof === claim.id || !!claim.paymentProof}
                      style={{
                        padding: ".5rem 1rem",
                        background: claim.paymentProof ? "#6b7280" : "#f59e0b",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: uploadingProof === claim.id || claim.paymentProof ? "not-allowed" : "pointer",
                        fontWeight: 600,
                        fontSize: "0.875rem"
                      }}
                    >
                      {uploadingProof === claim.id ? "Subiendo..." : claim.paymentProof ? "✓ Comprobante Adjunto" : "📎 Adjuntar Comprobante"}
                    </button>
                    {claim.paymentProof && (
                      <a
                        href={claim.paymentProof}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: ".5rem 1rem",
                          background: "#3b82f6",
                          color: "#fff",
                          textDecoration: "none",
                          borderRadius: "8px",
                          fontWeight: 600,
                          fontSize: "0.875rem"
                        }}
                      >
                        👁️ Ver Comprobante
                      </a>
                    )}
                    <button
                      onClick={() => handleMarkPaid(claim.id)}
                      disabled={processing === claim.id || !claim.paymentProof}
                      style={{
                        padding: ".5rem 1rem",
                        background: !claim.paymentProof ? "#6b7280" : "#85BB65",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        cursor: processing === claim.id || !claim.paymentProof ? "not-allowed" : "pointer",
                        fontWeight: 700
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
                        fontWeight: 600
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
