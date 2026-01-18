"use client";

import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCheck, X } from "lucide-react";
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

interface NotificationBellProps {
  className?: string;
}

export default function NotificationBell({ className = "" }: NotificationBellProps) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Cargar notificaciones
  const loadNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/user/notifications?page=1&limit=10", {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.notifications.filter((n: Notification) => !n.read).length);
      }
    } catch (error) {
      console.error("Error al cargar notificaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  // Marcar una notificación como leída
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("token")}`,
        },
        body: JSON.stringify({ notificationId, read: true }),
      });

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notificationId ? { ...n, read: true, readAt: new Date().toISOString() } : n
          )
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error al marcar notificación como leída:", error);
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
        setNotifications((prev) =>
          prev.map((n) => ({ ...n, read: true, readAt: new Date().toISOString() }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error("Error al marcar todas como leídas:", error);
    }
  };

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Cargar notificaciones al montar
  useEffect(() => {
    loadNotifications();
    // Recargar cada 30 segundos
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Obtener icono y color según tipo de notificación
  const getNotificationStyle = (type: NotificationType) => {
    switch (type) {
      case "TICKET_PURCHASED":
        return { icon: "🎫", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case "TICKET_CONFIRMED":
        return { icon: "✅", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      case "RAFFLE_WON":
        return { icon: "🎉", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" };
      case "PRIZE_CLAIMED":
        return { icon: "💰", color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" };
      case "PRIZE_PAID":
        return { icon: "💸", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };
      case "ACCOUNT_UPDATED":
        return { icon: "👤", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" };
      case "SYSTEM":
        return { icon: "⚙️", color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" };
      case "RAFFLE_CLOSING_SOON":
        return { icon: "⏰", color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200" };
      case "FAVORITE_RAFFLE_UPDATED":
        return { icon: "⭐", color: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200" };
      default:
        return { icon: "📢", color: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" };
    }
  };

  // Formatear fecha relativa
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Ahora mismo";
    if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? "minuto" : "minutos"}`;
    if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? "hora" : "horas"}`;
    if (diffDays < 7) return `Hace ${diffDays} ${diffDays === 1 ? "día" : "días"}`;
    return date.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div className={`notification-bell-container ${className}`} ref={dropdownRef}>
      {/* Botón de campana */}
      <button
        className="notification-bell-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Notificaciones"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="notification-badge">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown de notificaciones */}
      {isOpen && (
        <div className="notification-dropdown">
          {/* Header del dropdown */}
          <div className="notification-dropdown-header">
            <h3 className="notification-dropdown-title">Notificaciones</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="notification-dropdown-close"
              aria-label="Cerrar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Botón marcar todas como leídas */}
          {unreadCount > 0 && (
            <div className="notification-dropdown-actions">
              <button
                onClick={markAllAsRead}
                className="notification-mark-all-btn"
              >
                <CheckCheck className="w-4 h-4" />
                Marcar todas como leídas
              </button>
            </div>
          )}

          {/* Lista de notificaciones */}
          <div className="notification-list">
            {loading ? (
              <div className="notification-loading">Cargando...</div>
            ) : notifications.length === 0 ? (
              <div className="notification-empty">
                <Bell className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                <p>No tienes notificaciones</p>
              </div>
            ) : (
              notifications.map((notification) => {
                const style = getNotificationStyle(notification.type);
                return (
                  <div
                    key={notification.id}
                    className={`notification-item ${!notification.read ? "notification-unread" : ""}`}
                    onClick={() => !notification.read && markAsRead(notification.id)}
                  >
                    {/* Indicador de no leída */}
                    {!notification.read && <div className="notification-unread-indicator" />}

                    {/* Icono */}
                    <div className={`notification-icon ${style.color}`}>
                      <span className="text-xl">{style.icon}</span>
                    </div>

                    {/* Contenido */}
                    <div className="notification-content">
                      <h4 className="notification-title">{notification.title}</h4>
                      <p className="notification-message">{notification.message}</p>
                      <span className="notification-time">
                        {formatRelativeTime(notification.createdAt)}
                      </span>
                    </div>

                    {/* Botón de marcar como leída */}
                    {!notification.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsRead(notification.id);
                        }}
                        className="notification-mark-read-btn"
                        aria-label="Marcar como leída"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer con botón "Ver todas" */}
          <div className="notification-dropdown-footer">
            <a
              href="/cuenta/notificaciones"
              className="notification-view-all-btn"
              onClick={() => setIsOpen(false)}
            >
              Ver todas las notificaciones
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
