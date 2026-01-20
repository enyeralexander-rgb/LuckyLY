"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";
import { getItemWithEmoji } from "../../../../../lib/raffleEmojis";
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
    };
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

  async function handleConfirmAll(ticketId: string, itemIds: string[]) {
    if (!auth?.token || processing) return;

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

  async function handleRejectAll(ticketId: string, itemIds: string[]) {
    if (!auth?.token || processing) return;

    if (!confirm("¿Estás seguro de rechazar esta compra? Todos los cupos volverán a estar disponibles.")) {
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

  if (!auth) {
    return null;
  }

  return (
    <>
      <AdminNavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1000px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, color: "var(--text-primary)" }}>Confirmar Pagos Móviles</h1>
          <Link href="/admin" style={{ color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
            ← Volver al Dashboard
          </Link>
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
                        <strong style={{ color: "var(--text-primary)" }}>{group.ticket.user.name}</strong>
                        <span style={{ color: "var(--text-secondary)", fontSize: "0.875rem", marginLeft: "0.5rem" }}>
                          ({group.ticket.user.email})
                        </span>
                      </div>
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      <strong>Fecha:</strong> {new Date(group.ticket.purchasedAt).toLocaleString()}
                    </div>
                  </div>

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
                      onClick={() => handleConfirmAll(group.ticketId, itemIds)}
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
                      onClick={() => handleRejectAll(group.ticketId, itemIds)}
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
