"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { clearStoredAuth, getStoredAuth } from "../lib/clientAuth";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { useNotificationStats } from "@/hooks/useNotificationStats";

export function AdminNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark, toggleTheme } = useTheme();
  const { stats } = useNotificationStats();

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      clearStoredAuth();
      window.location.href = "/";
    }
  }

  const isDashboard = pathname === "/admin";
  const hasNotifications = (stats?.total ?? 0) > 0;

  return (
    <header className="navbar-responsive admin-navbar-minimal">
      <div className="admin-navbar-inner">
        <div
          className="navbar-logo"
          onClick={() => router.push("/")}
          title="Ir a página principal"
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && router.push("/")}
        >
          <img
            src={isDark ? "/images/LuckyLy-Logo-BLANCO-SIN-FONDO.png" : "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png"}
            alt="LuckyLY"
          />
        </div>

        <nav className="admin-navbar-nav">
          <Link
            href="/admin"
            className={`admin-navbar-dashboard ${isDashboard ? "active" : ""}`}
            style={{ position: "relative" }}
          >
            Dashboard
            {hasNotifications && <NotificationBadge count={stats!.total} className="admin-navbar-badge" />}
          </Link>
        </nav>

        <div className="admin-navbar-actions">
          <Link 
            href="/faq" 
            target="_blank"
            style={{ 
              marginRight: "0.5rem", 
              color: "var(--text-primary)", 
              textDecoration: "none", 
              fontSize: "0.875rem", 
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.5rem 1rem",
              borderRadius: "8px",
              background: "var(--bg-accent)"
            }}
          >
            ❓ Preguntas Frecuentes
          </Link>
          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-button admin-navbar-theme"
            title={isDark ? "Modo claro" : "Modo oscuro"}
            aria-label={isDark ? "Modo claro" : "Modo oscuro"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
          <button type="button" onClick={logout} className="admin-logout-button">
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
