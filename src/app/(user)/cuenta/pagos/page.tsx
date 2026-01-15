"use client";
import { NavBar } from "../../../../components/NavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import Link from "next/link";
import { getItemWithEmoji } from "../../../../lib/raffleEmojis";

export default function PagosPage() {
  const [auth, setAuth] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadPayments();
    }
  }, [auth, page]);

  async function loadPayments() {
    if (!auth?.token) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/user/payments?page=${page}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (data.error) {
        console.error("Error:", data.error);
        setPayments([]);
      } else {
        setPayments(data.payments || []);
        setTotalPages(data.pagination?.totalPages || 1);
      }
    } catch (err) {
      console.error("Error:", err);
      setPayments([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <NavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0 }}>💳 Historial de Pagos</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>
            ← Volver a MI CUENTA
          </Link>
        </div>

        {loading ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando pagos...</div>
        ) : payments.length === 0 ? (
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>
            <p style={{ margin: 0, color: "#6b7280" }}>No tienes pagos registrados aún.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: "1rem", marginBottom: "2rem" }}>
              {payments.map((payment) => (
                <div key={payment.id} className="card" style={{ padding: "1.5rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                    <div>
                      <h3 style={{ margin: "0 0 0.5rem", color: "#3E3E3C" }}>{payment.raffle?.title || "Sorteo"}</h3>
                      <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
                        {new Date(payment.purchasedAt).toLocaleString("es-ES")}
                      </p>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#85BB65" }}>
                        Bs. {payment.totalPaid.toFixed(2)}
                      </div>
                      <div
                        style={{
                          padding: "0.25rem 0.75rem",
                          borderRadius: "4px",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                          background:
                            payment.status === "CONFIRMED"
                              ? "rgba(133, 187, 101, 0.1)"
                              : payment.status === "WIN"
                              ? "rgba(239, 68, 68, 0.1)"
                              : "rgba(245, 158, 11, 0.1)",
                          color:
                            payment.status === "CONFIRMED"
                              ? "#85BB65"
                              : payment.status === "WIN"
                              ? "#ef4444"
                              : "#f59e0b",
                        }}
                      >
                        {payment.status === "CONFIRMED"
                          ? "Confirmado"
                          : payment.status === "WIN"
                          ? "Ganador"
                          : payment.status === "PENDING"
                          ? "Pendiente"
                          : payment.status}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: "1rem" }}>
                    <p style={{ margin: "0 0 0.5rem", color: "#3E3E3C", fontWeight: 600, fontSize: "0.875rem" }}>
                      Cupos comprados:
                    </p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                      {Array.isArray(payment.items) &&
                        payment.items.map((item: string, idx: number) => (
                          <span
                            key={idx}
                            style={{
                              padding: "0.25rem 0.75rem",
                              background: "#F5F5E6",
                              borderRadius: "4px",
                              fontSize: "0.875rem",
                              color: "#3E3E3C",
                            }}
                          >
                            {getItemWithEmoji(item, payment.raffle?.type || "ANIMALS")}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", fontSize: "0.875rem" }}>
                    <div>
                      <span style={{ color: "#6b7280" }}>Método: </span>
                      <span style={{ color: "#3E3E3C", fontWeight: 600 }}>
                        {payment.paymentMethod === "MOBILE"
                          ? "Pago Móvil"
                          : payment.paymentMethod === "BANESCO"
                          ? "Banesco"
                          : payment.paymentMethod || "N/A"}
                      </span>
                    </div>
                    {payment.paymentMobileRef && (
                      <div>
                        <span style={{ color: "#6b7280" }}>Referencia: </span>
                        <span style={{ color: "#3E3E3C", fontWeight: 600 }}>{payment.paymentMobileRef}</span>
                      </div>
                    )}
                  </div>

                  {payment.isWinner && (
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "1rem",
                        background: "rgba(239, 68, 68, 0.1)",
                        borderRadius: "8px",
                        color: "#ef4444",
                        fontWeight: 600,
                      }}
                    >
                      🎉 ¡Felicidades! Has ganado este sorteo
                      {payment.prizeClaim && (
                        <div style={{ marginTop: "0.5rem", fontSize: "0.875rem" }}>
                          Estado del reclamo: {payment.prizeClaim.status}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", alignItems: "center" }}>
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{
                    padding: "0.5rem 1rem",
                    background: page === 1 ? "#6b7280" : "#85BB65",
                    color: "#3E3E3C",
                    border: "none",
                    borderRadius: "8px",
                    cursor: page === 1 ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  Anterior
                </button>
                <span style={{ color: "#3E3E3C" }}>
                  Página {page} de {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{
                    padding: "0.5rem 1rem",
                    background: page === totalPages ? "#6b7280" : "#85BB65",
                    color: "#3E3E3C",
                    border: "none",
                    borderRadius: "8px",
                    cursor: page === totalPages ? "not-allowed" : "pointer",
                    fontWeight: 600,
                  }}
                >
                  Siguiente
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </AuthGuard>
  );
}
