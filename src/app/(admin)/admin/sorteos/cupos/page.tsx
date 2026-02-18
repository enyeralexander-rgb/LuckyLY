"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import { getItemWithEmoji } from "../../../../../lib/raffleEmojis";
import { formatBankDisplay } from "../../../../../lib/banks";
import Link from "next/link";

type GroupedPending = {
  ticketId: string;
  items: Array<{ id: string; value: string }>;
  ticket: {
    id: string;
    purchasedAt: string;
    totalPaid: number;
    paymentMobileRef: string | null;
    user: {
      name: string;
      email: string;
      nationalId: string | null;
      phoneNumber: string | null;
      bank: string | null;
      bankPhone: string | null;
    } | null;
  };
  raffle: {
    id: string;
    title: string;
    type: string;
    pricePerSlot: number;
  };
};

function ConfirmarCuposPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [pendingGroups, setPendingGroups] = useState<GroupedPending[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [emailTemplateModal, setEmailTemplateModal] = useState(false);
  const [emailTemplateBody, setEmailTemplateBody] = useState("");
  const [emailTemplateSaving, setEmailTemplateSaving] = useState(false);

  useEffect(() => {
    setAuth(getStoredAuth());
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadPendingItems();
    }
  }, [auth]);

  function loadPendingItems() {
    setLoading(true);
    fetch("/api/admin/pending-slots", { headers: { Authorization: `Bearer ${auth.token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          console.error("Error:", data.error);
          setPendingGroups([]);
        } else {
          setPendingGroups(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(() => {
        setPendingGroups([]);
        setLoading(false);
      });
  }

  async function handleConfirmAll(ticketId: string, itemIds: string[], userName: string, amount: number) {
    if (!auth?.token || processing) return;

    if (!confirm(`¿Estás seguro de CONFIRMAR este pago?\n\nUsuario: ${userName}\nMonto: Bs. ${amount.toFixed(2)}\nCupos: ${itemIds.length}\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setProcessing(ticketId);
    try {
      // Confirmar todos los cupos del ticket
      for (const itemId of itemIds) {
        const res = await fetch(`/api/admin/pending-slots/${itemId}/confirm`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error al confirmar cupo");
        }
      }
      loadPendingItems();
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Error al confirmar cupos");
    } finally {
      setProcessing(null);
    }
  }

  async function handleRejectAll(ticketId: string, itemIds: string[], userName: string, amount: number) {
    if (!auth?.token || processing) return;

    if (!confirm(`¿Estás seguro de RECHAZAR este pago?\n\nUsuario: ${userName}\nMonto: Bs. ${amount.toFixed(2)}\nCupos: ${itemIds.length}\n\n⚠️ Todos los cupos volverán a estar disponibles.\nEsta acción no se puede deshacer.`)) {
      return;
    }

    setProcessing(ticketId);
    try {
      // Rechazar todos los cupos del ticket
      for (const itemId of itemIds) {
        const res = await fetch(`/api/admin/pending-slots/${itemId}/reject`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth.token}` }
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Error al rechazar cupo");
        }
      }
      loadPendingItems();
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "Error al rechazar cupos");
    } finally {
      setProcessing(null);
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

  async function openEmailTemplateModal() {
    if (!auth?.token) return;
    setEmailTemplateModal(true);
    try {
      const res = await fetch("/api/admin/approval-email-template", {
        headers: { Authorization: `Bearer ${auth.token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailTemplateBody(data.body || "");
      }
    } catch {}
  }

  async function saveEmailTemplate() {
    if (!auth?.token) return;
    setEmailTemplateSaving(true);
    try {
      const res = await fetch("/api/admin/approval-email-template", {
        method: "POST",
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

  if (!auth) {
    return null;
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1000px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem", flexWrap: "wrap", gap: "0.75rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Confirmar Pagos Móviles</h1>
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={openEmailTemplateModal}
              style={{ padding: "0.5rem 1rem", background: "#6366f1", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: 600, fontSize: "0.875rem" }}
            >
              ✉️ Email de Aprobación
            </button>
            <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
              ← Volver al Dashboard
            </Link>
          </div>
        </div>
        
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : pendingGroups.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
            No hay pagos pendientes de confirmación
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {pendingGroups.map((group) => {
              const itemIds = group.items.map(i => i.id);
              const isProcessing = processing === group.ticketId;
              
              return (
                <div key={group.ticketId} className="card" style={{ padding: "1.5rem" }}>
                  {/* Header con estado */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 .5rem", color: "var(--text-primary)" }}>{group.raffle.title}</h3>
                      <p style={{ margin: 0, color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                        Tipo: {getTypeLabel(group.raffle.type)}
                      </p>
                    </div>
                    <span style={{ 
                      padding: ".35rem 1rem", 
                      background: "#f59e0b", 
                      borderRadius: "6px", 
                      fontSize: ".8rem", 
                      color: "#fff", 
                      fontWeight: 700 
                    }}>
                      ⏳ PENDIENTE
                    </span>
                  </div>

                  {/* Info del usuario */}
                  <div style={{ 
                    padding: "1rem", 
                    background: "var(--bg-secondary)", 
                    borderRadius: "8px", 
                    marginBottom: "1rem",
                    display: "grid",
                    gap: "0.5rem"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <span style={{ fontSize: "1.25rem" }}>👤</span>
                      <div>
                        <strong style={{ color: "var(--text-primary)" }}>{group.ticket.user?.name ?? "—"}</strong>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
                          ({group.ticket.user?.email ?? "—"})
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      <strong>Fecha:</strong> {new Date(group.ticket.purchasedAt).toLocaleString()}
                    </div>
                  </div>

                  {/* Datos bancarios del usuario */}
                  {group.ticket.user && (
                    <div style={{ 
                      padding: "1rem", 
                      background: "#1f2937", 
                      borderRadius: "8px", 
                      marginBottom: "1rem"
                    }}>
                      <h4 style={{ margin: "0 0 .5rem", fontSize: ".875rem", color: "var(--text-primary)" }}>Datos Bancarios</h4>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: ".5rem", fontSize: ".875rem", color: "var(--text-secondary)" }}>
                        <div><strong>Banco:</strong> {group.ticket.user.bank ? formatBankDisplay(group.ticket.user.bank) : "No especificado"}</div>
                        <div><strong>Cédula:</strong> {group.ticket.user.nationalId || "No especificada"}</div>
                        <div><strong>Teléfono:</strong> {group.ticket.user.phoneNumber || group.ticket.user.bankPhone || "No especificado"}</div>
                      </div>
                    </div>
                  )}

                  {/* Cupos comprados */}
                  <div style={{ 
                    padding: "1rem", 
                    background: "rgba(133, 187, 101, 0.1)", 
                    borderRadius: "8px", 
                    marginBottom: "1rem",
                    border: "1px solid rgba(133, 187, 101, 0.3)"
                  }}>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: 600 }}>
                      CUPOS COMPRADOS ({group.items.length}):
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                      {group.items.map((item) => (
                        <span 
                          key={item.id}
                          style={{ 
                            padding: ".5rem .75rem", 
                            background: "#85BB65", 
                            borderRadius: "6px", 
                            fontSize: ".9rem", 
                            color: "#fff", 
                            fontWeight: 600 
                          }}
                        >
                          {getItemWithEmoji(item.value, group.raffle.type)}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Total y referencia */}
                  <div style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr", 
                    gap: "1rem", 
                    marginBottom: "1rem" 
                  }}>
                    <div style={{ 
                      padding: "1rem", 
                      background: "var(--bg-secondary)", 
                      borderRadius: "8px",
                      textAlign: "center"
                    }}>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>TOTAL A PAGAR</div>
                      <div style={{ fontSize: "1.5rem", fontWeight: 700, color: "#85BB65" }}>
                        Bs. {Number(group.ticket.totalPaid).toFixed(2)}
                      </div>
                    </div>
                    {group.ticket.paymentMobileRef && (
                      <div style={{ 
                        padding: "1rem", 
                        background: "rgba(245, 158, 11, 0.1)", 
                        borderRadius: "8px",
                        border: "2px solid #f59e0b",
                        textAlign: "center"
                      }}>
                        <div style={{ fontSize: "0.75rem", color: "#f59e0b", marginBottom: "0.25rem", fontWeight: 600 }}>
                          REFERENCIA PAGO MÓVIL
                        </div>
                        <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "1px" }}>
                          {group.ticket.paymentMobileRef}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Botones de acción */}
                  <div style={{ display: "flex", gap: ".75rem" }}>
                    <button
                      onClick={() => handleConfirmAll(group.ticketId, itemIds, group.ticket.user?.name ?? "Usuario", Number(group.ticket.totalPaid))}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        padding: ".75rem 1.5rem",
                        background: isProcessing ? "#6b7280" : "#10b981",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        fontSize: "1rem"
                      }}
                    >
                      {isProcessing ? "Procesando..." : "✓ Confirmar Pago"}
                    </button>
                    <button
                      onClick={() => handleRejectAll(group.ticketId, itemIds, group.ticket.user?.name ?? "Usuario", Number(group.ticket.totalPaid))}
                      disabled={isProcessing}
                      style={{
                        flex: 1,
                        padding: ".75rem 1.5rem",
                        background: isProcessing ? "#6b7280" : "#ef4444",
                        color: "#fff",
                        border: "none",
                        borderRadius: "8px",
                        fontWeight: 700,
                        cursor: isProcessing ? "not-allowed" : "pointer",
                        fontSize: "1rem"
                      }}
                    >
                      {isProcessing ? "Procesando..." : "✕ Rechazar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Email Template */}
      {emailTemplateModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div style={{ background: "var(--card-bg)", borderRadius: "12px", padding: "2rem", maxWidth: "600px", width: "100%", maxHeight: "85vh", overflow: "auto" }}>
            <h2 style={{ margin: "0 0 1rem", color: "var(--text-primary)" }}>✉️ Texto de Email de Aprobación</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
              Este texto se enviará al usuario cuando se confirmen todos los cupos de su compra.
            </p>
            <div style={{ padding: "0.75rem", background: "rgba(99, 102, 241, 0.1)", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              <strong>Placeholders disponibles:</strong><br />
              <code>{"{{userName}}"}</code> — Nombre del usuario<br />
              <code>{"{{raffleTitle}}"}</code> — Título del sorteo<br />
              <code>{"{{items}}"}</code> — Lista de cupos confirmados
            </div>
            <textarea
              value={emailTemplateBody}
              onChange={(e) => setEmailTemplateBody(e.target.value)}
              rows={10}
              style={{ width: "100%", padding: "1rem", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-secondary)", color: "var(--text-primary)", fontSize: "0.9rem", resize: "vertical", fontFamily: "inherit" }}
              placeholder={"Hola {{userName}},\n\nTu compra ha sido aprobada.\n\nSorteo: {{raffleTitle}}\nCupos: {{items}}\n\n¡Buena suerte!"}
            />
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
              <button
                onClick={saveEmailTemplate}
                disabled={emailTemplateSaving}
                style={{ flex: 1, padding: "0.75rem", background: emailTemplateSaving ? "#6b7280" : "#10b981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: 600, cursor: emailTemplateSaving ? "not-allowed" : "pointer" }}
              >
                {emailTemplateSaving ? "Guardando..." : "Guardar"}
              </button>
              <button
                onClick={() => setEmailTemplateModal(false)}
                style={{ flex: 1, padding: "0.75rem", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border-color)", borderRadius: "8px", fontWeight: 600, cursor: "pointer" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ConfirmarCuposPage() {
  return (
    <AuthGuard requiredRole={["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"]}>
      <ConfirmarCuposPageContent />
    </AuthGuard>
  );
}
