"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { NotificationType } from "@prisma/client";

interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: string;
  updatedAt: string;
  readAt?: string | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });

  // Cargar notificaciones
  const loadNotifications = async (page: number = 1, filterType: string = filter) => {
    try {
      setLoading(true);
      const readParam = filterType === "unread" ? "false" : filterType === "read" ? "true" : "";
      const url = `/api/user/notifications?page=${page}&limit=${pagination.limit}${readParam ? `&read=${readParam}` : ""}`;

      const response = await fetch(url, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar una notificación como leída/no leída
  const toggleRead = async (notificationId: string, currentReadStatus: boolean) => {
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ notificationId, read: !currentReadStatus }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId
              ? { ...n, read: !currentReadStatus, readAt: !currentReadStatus ? new Date().toISOString() : null }
              : n
          )
        );
      }
    } catch (error) {
      console.error("Error al actualizar notificación:", error);
    }
  };

  // Marcar todas como leídas
  const markAllAsRead = async () => {
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (response.ok) {
        loadNotifications(pagination.page, filter);
      }
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  // Cambiar filtro
  const handleFilterChange = (newFilter: "all" | "unread" | "read") => {
    setFilter(newFilter);
    loadNotifications(1, newFilter);
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      loadNotifications(newPage, filter);
    }
  };

  // Cargar notificaciones al montar
  useEffect(() => {
    loadNotifications();
  }, []);

  // Obtener icono y color según tipo de notificación
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case "TICKET_PURCHASED":
        return { icon: "🎫", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Compra de Boleto" };
      case "TICKET_CONFIRMED":
        return { icon: "✅", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Boleto Confirmado" };
      case "RAFFLE_WON":
        return { icon: "🎉", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", label: "¡Ganaste!" };
      case "PRIZE_CLAIMED":
        return { icon: "💰", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200", label: "Premio Reclamado" };
      case "PRIZE_PAID":
        return { icon: "💸", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", label: "Premio Pagado" };
      case "ACCOUNT_UPDATED":
        return { icon: "👤", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", label: "Cuenta Actualizada" };
      case "SYSTEM":
        return { icon: "⚙️", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", label: "Sistema" };
      case "RAFFLE_CLOSING_SOON":
        return { icon: "⏰", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", label: "Sorteo por Cerrar" };
      case "FAVORITE_RAFFLE_UPDATED":
        return { icon: "⭐", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200", label: "Favorito Actualizado" };
      default:
        return { icon: "📢", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200", label: "Notificación" };
    }
  };

  // Formatear fecha
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    if (diffDays === 1) return "Ayer";
    if (diffDays < 7) return `Hace ${diffDays} días`;
    return date.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="notifications-page-container">
      <div className="notifications-page-wrapper">
        {/* Header */}
        <div className="notifications-page-header">
          <div className="notifications-page-title-section">
            <Bell className="w-8 h-8 text-primary" />
            <div>
              <h1 className="notifications-page-title">Notificaciones</h1>
              <p className="notifications-page-subtitle">
                {pagination.total === 0
                  ? "No tienes notificaciones"
                  : `${pagination.total} ${pagination.total === 1 ? "notificación" : "notificaciones"}`}
                {unreadCount > 0 && ` (${unreadCount} sin leer)`}
              </p>
            </div>
          </div>

          {/* Filtros */}
          <div className="notifications-filter-buttons">
            <button
              className={`notifications-filter-btn ${filter === "all" ? "active" : ""}`}
              onClick={() => handleFilterChange("all")}
            >
              Todas
            </button>
            <button
              className={`notifications-filter-btn ${filter === "unread" ? "active" : ""}`}
              onClick={() => handleFilterChange("unread")}
            >
              No leídas
            </button>
            <button
              className={`notifications-filter-btn ${filter === "read" ? "active" : ""}`}
              onClick={() => handleFilterChange("read")}
            >
              Leídas
            </button>
          </div>

          {/* Botón marcar todas como leídas */}
          {unreadCount > 0 && (
            <button
              className="notifications-mark-all-btn-page"
              onClick={markAllAsRead}
            >
              <Check className="w-4 h-4" />
              Marcar todas como leídas
            </button>
          )}
        </div>

        {/* Lista de notificaciones */}
        <div className="notifications-page-list">
          {loading ? (
            <div className="notifications-page-loading">
              <div className="spinner"></div>
              <p>Cargando notificaciones...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-page-empty">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-semibold mb-2">No hay notificaciones</h3>
              <p className="text-gray-600 dark:text-gray-400">
                {filter === "all"
                  ? "No tienes ninguna notificación aún."
                  : filter === "unread"
                  ? "No tienes notificaciones sin leer."
                  : "No tienes notificaciones leídas."}
              </p>
            </div>
          ) : (
            notifications.map((notification) => {
              const style = getNotificationStyle(notification.type);
              return (
                <div
                  key={notification.id}
                  className={`notifications-page-item ${!notification.read ? "unread" : ""}`}
                >
                  {/* Indicador de no leída */}
                  {!notification.read && <div className="notifications-page-unread-indicator" />}

                  {/* Icono */}
                  <div className={`notifications-page-icon ${style.color}`}>
                    <span className="text-2xl">{style.icon}</span>
                  </div>

                  {/* Contenido */}
                  <div className="notifications-page-content">
                    <div className="notifications-page-header-row">
                      <span className={`notifications-page-type-badge ${style.color}`}>
                        {style.label}
                      </span>
                      <span className="notifications-page-date">
                        {formatDate(notification.createdAt)}
                      </span>
                    </div>
                    <h3 className="notifications-page-item-title">{notification.title}</h3>
                    <p className="notifications-page-message">{notification.message}</p>
                  </div>

                  {/* Botón de acción */}
                  <button
                    onClick={() => toggleRead(notification.id, notification.read)}
                    className="notifications-page-action-btn"
                    title={notification.read ? "Marcar como no leída" : "Marcar como leída"}
                  >
                    {notification.read ? <X className="w-5 h-5" /> : <Check className="w-5 h-5" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Paginación */}
        {pagination.totalPages > 1 && (
          <div className="notifications-pagination">
            <button
              className="notifications-pagination-btn"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="notifications-pagination-info">
              Página {pagination.page} de {pagination.totalPages}
            </div>

            <button
              className="notifications-pagination-btn"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
