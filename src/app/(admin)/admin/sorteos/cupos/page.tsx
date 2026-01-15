"use client";
import { AdminNavBar } from "../../../../../components/AdminNavBar";
import { AuthGuard } from "../../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../../lib/clientAuth";

type PendingTicketItem = {
  id: string;
  value: string;
  status: string;
  ticket: {
    id: string;
    user: {
      name: string;
      email: string;
    };
    purchasedAt: string;
    totalPaid: number;
    paymentMobileRef: string | null;
  };
  raffle: {
    id: string;
    title: string;
    type: string;
  };
};

function ConfirmarCuposPageContent() {
  const [auth, setAuth] = useState<any>(null);
  const [pendingItems, setPendingItems] = useState<PendingTicketItem[]>([]);
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
          setPendingItems([]);
        } else {
          setPendingItems(Array.isArray(data) ? data : []);
        }
        setLoading(false);
      })
      .catch(() => {
        setPendingItems([]);
        setLoading(false);
      });
  }

  async function handleConfirm(itemId: string) {
    if (!auth?.token || processing) return;

    setProcessing(itemId);
    try {
      const res = await fetch(`/api/admin/pending-slots/${itemId}/confirm`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (res.ok) {
        loadPendingItems();
      } else {
        const error = await res.json();
        alert(error.error || "Error al confirmar cupo");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al confirmar cupo");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(itemId: string) {
    if (!auth?.token || processing) return;

    if (!confirm("¿Estás seguro de rechazar este cupo? El cupo volverá a estar disponible.")) {
      return;
    }

    setProcessing(itemId);
    try {
      const res = await fetch(`/api/admin/pending-slots/${itemId}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`
        }
      });

      if (res.ok) {
        loadPendingItems();
      } else {
        const error = await res.json();
        alert(error.error || "Error al rechazar cupo");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error al rechazar cupo");
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
      <main className="container" style={{ paddingTop: "2rem" }}>
        <h1>Confirmar Cupos de Pago Móvil</h1>
        
        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        ) : pendingItems.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
            No hay cupos pendientes de confirmación
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1rem" }}>
            {pendingItems.map((item) => (
              <div key={item.id} className="card" style={{ padding: "1.5rem", display: "grid", gap: "1rem" }}>
                <div style={{ display: "grid", gap: ".5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start" }}>
                    <div>
                      <h3 style={{ margin: "0 0 .5rem" }}>{item.raffle.title}</h3>
                      <div style={{ display: "grid", gap: ".25rem", fontSize: ".875rem", color: "#94a3b8" }}>
                        <div><strong>Tipo:</strong> {getTypeLabel(item.raffle.type)}</div>
                        <div><strong>Cupo:</strong> <span style={{ color: "#f59e0b", fontWeight: 700 }}>{item.value}</span></div>
                        <div><strong>Usuario:</strong> {item.ticket.user.name} ({item.ticket.user.email})</div>
                        <div><strong>Total pagado:</strong> {Number(item.ticket.totalPaid).toFixed(2)} Bs</div>
                        <div><strong>Fecha:</strong> {new Date(item.ticket.purchasedAt).toLocaleString()}</div>
                        {item.ticket.paymentMobileRef && (
                          <div style={{ marginTop: ".5rem", padding: ".75rem", background: "rgba(133, 187, 101, 0.1)", borderRadius: "8px", border: "2px solid #85BB65" }}>
                            <div style={{ fontSize: ".75rem", color: "#94a3b8", marginBottom: ".25rem", fontWeight: 600 }}>REFERENCIA DE PAGO MÓVIL:</div>
                            <div style={{ fontSize: "1rem", color: "#85BB65", fontWeight: 700, letterSpacing: "0.5px" }}>
                              {item.ticket.paymentMobileRef}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{ 
                      padding: ".25rem .75rem", 
                      background: "#f59e0b", 
                      borderRadius: "6px", 
                      fontSize: ".75rem", 
                      color: "#3E3E3C", 
                      fontWeight: 700 
                    }}>
                      PENDIENTE
                    </span>
                  </div>
                </div>
                
                <div style={{ display: "flex", gap: ".75rem", marginTop: ".5rem" }}>
                  <button
                    onClick={() => handleConfirm(item.id)}
                    disabled={processing === item.id}
                    style={{
                      flex: 1,
                      padding: ".75rem 1.5rem",
                      background: processing === item.id ? "#6b7280" : "#85BB65",
                      color: "#3E3E3C",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: processing === item.id ? "not-allowed" : "pointer"
                    }}
                  >
                    {processing === item.id ? "Procesando..." : "✓ Aceptar"}
                  </button>
                  <button
                    onClick={() => handleReject(item.id)}
                    disabled={processing === item.id}
                    style={{
                      flex: 1,
                      padding: ".75rem 1.5rem",
                      background: processing === item.id ? "#6b7280" : "#ef4444",
                      color: "#3E3E3C",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: 700,
                      cursor: processing === item.id ? "not-allowed" : "pointer"
                    }}
                  >
                    {processing === item.id ? "Procesando..." : "✕ Rechazar"}
                  </button>
                </div>
              </div>
            ))}
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
