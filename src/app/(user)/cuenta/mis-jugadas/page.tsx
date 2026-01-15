"use client";
import Link from "next/link";
import { NavBar } from "../../../../components/NavBar";
import { AuthGuard } from "../../../../components/AuthGuard";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../../../../lib/clientAuth";
import { useRouter } from "next/navigation";
import { getItemWithEmoji } from "../../../../lib/raffleEmojis";

type Raffle = {
  id: string;
  title: string;
  type: string;
  status: string;
  winningItem: string | null;
  pricePerSlot: number;
  prizes: any;
  closesAt: string | null;
};

type Ticket = {
  id: string;
  raffleId: string;
  items: string[];
  totalPaid: number;
  status: string;
  purchasedAt: string;
  raffle: Raffle;
  prizeClaim: { status: string } | null;
};

type Notification = {
  id: string;
  type: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  createdAt: string;
};

export default function MisJugadasPage() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"notificaciones">("notificaciones");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedAuth = getStoredAuth();
    if (storedAuth) {
      setAuth(storedAuth);
    }
  }, []);

  useEffect(() => {
    if (auth?.token) {
      loadData();
    }
  }, [auth]);

  async function loadData() {
    if (!auth?.token) return;
    setLoading(true);
    try {
      const [ticketsRes, notificationsRes] = await Promise.all([
        fetch("/api/claims", { headers: { Authorization: `Bearer ${auth.token}` } }),
        fetch("/api/user/notifications", { headers: { Authorization: `Bearer ${auth.token}` } })
      ]);

      const ticketsData = await ticketsRes.json();
      const notificationsData = await notificationsRes.json();

      setTickets(Array.isArray(ticketsData) ? ticketsData : []);
      setNotifications(Array.isArray(notificationsData) ? notificationsData : []);
    } catch (err) {
      console.error("Error al cargar datos:", err);
    } finally {
      setLoading(false);
    }
  }

  async function markNotificationAsRead(notificationId: string) {
    if (!auth?.token) return;
    try {
      await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`
        },
        body: JSON.stringify({ notificationId, read: true })
      });
      setNotifications(notifications.map(n => n.id === notificationId ? { ...n, read: true } : n));
    } catch (err) {
      console.error("Error al marcar notificación:", err);
    }
  }

  function downloadTicketPDF(ticketId: string) {
    window.open(`/api/tickets/${ticketId}/pdf`, "_blank");
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


  const unreadNotifications = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <AuthGuard requiredRole={["USER"]}>
        <NavBar />
        <main className="container" style={{ paddingTop: "2rem" }}>
          <div className="card" style={{ padding: "2rem", textAlign: "center" }}>Cargando...</div>
        </main>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard requiredRole={["USER"]}>
      <NavBar />
      <main className="container" style={{ paddingTop: "2rem", maxWidth: "1200px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
          <h1 style={{ margin: 0 }}>TICKETS Y NOTIFICACIONES</h1>
          <Link href="/cuenta" style={{ color: "#85BB65", textDecoration: "none", fontWeight: 600 }}>← Volver a MI CUENTA</Link>
        </div>

        {/* Pestañas */}
        <div style={{ display: "flex", gap: ".5rem", borderBottom: "2px solid #d4d4c4", marginBottom: "2rem" }}>
          <button
            onClick={() => setActiveTab("notificaciones")}
            style={{
              padding: ".75rem 1.5rem",
              background: "#85BB65",
              color: "#3E3E3C",
              border: "none",
              borderBottom: "3px solid #85BB65",
              borderRadius: "8px 8px 0 0",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.2s",
              position: "relative"
            }}
          >
            Notificaciones {unreadNotifications > 0 && (
              <span style={{
                position: "absolute",
                top: "-5px",
                right: "-5px",
                background: "#ef4444",
                color: "#ffffff",
                borderRadius: "50%",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontWeight: 700
              }}>
                {unreadNotifications}
              </span>
            )}
          </button>
        </div>

        {/* Contenido de pestañas */}
        {activeTab === "notificaciones" && (
          <div className="card" style={{ padding: "1.5rem" }}>
            <h2 style={{ margin: "0 0 1.5rem", color: "#3E3E3C" }}>Notificaciones</h2>
            {notifications.length === 0 ? (
              <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>
                No tienes notificaciones
              </div>
            ) : (
              <div style={{ display: "grid", gap: "1rem" }}>
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => markNotificationAsRead(notification.id)}
                    style={{
                      padding: "1rem",
                      background: notification.read ? "#F5F5E6" : "rgba(133, 187, 101, 0.1)",
                      border: notification.read ? "1px solid #d4d4c4" : "2px solid #85BB65",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s"
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateX(5px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateX(0)";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "0.5rem" }}>
                      <h3 style={{ margin: 0, color: "#3E3E3C", fontSize: "1rem" }}>{notification.title}</h3>
                      {!notification.read && (
                        <span style={{
                          width: "10px",
                          height: "10px",
                          background: "#85BB65",
                          borderRadius: "50%",
                          flexShrink: 0
                        }} />
                      )}
                    </div>
                    <p style={{ margin: "0 0 0.5rem", color: "#6b7280", fontSize: "0.875rem" }}>{notification.message}</p>
                    <p style={{ margin: 0, color: "#9ca3af", fontSize: "0.75rem" }}>
                      {new Date(notification.createdAt).toLocaleString("es-ES")}
                    </p>
                    {notification.data?.ticketId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadTicketPDF(notification.data.ticketId);
                        }}
                        style={{
                          marginTop: "0.5rem",
                          padding: "0.5rem 1rem",
                          background: "#85BB65",
                          color: "#3E3E3C",
                          border: "none",
                          borderRadius: "6px",
                          fontWeight: 600,
                          cursor: "pointer",
                          fontSize: "0.875rem"
                        }}
                      >
                        📄 Descargar Ticket PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </main>
    </AuthGuard>
  );
}
