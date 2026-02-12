"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearStoredAuth, getStoredAuth } from "../lib/clientAuth";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";

import { NotificationBadge } from "@/components/ui/NotificationBadge";
import { useNotificationStats } from "@/hooks/useNotificationStats";

export function AdminNavBar() {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const [role, setRole] = useState<string | null>(null);
  const { stats } = useNotificationStats();

  useEffect(() => {
    const auth = getStoredAuth();
    setRole(auth?.user.role ?? null);
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      clearStoredAuth();
      // Forzar recarga para limpiar cualquier estado en caché
      window.location.href = "/auth/login";
    }
  }

  const isAgent = role === "AGENT";
  const isSuper = role === "SUPERADMIN";
  const isMaster = role === "MASTER";
  const canSeeUsers = isSuper || isMaster;
  const canSeeCMS = isSuper || isMaster;
  const canSeeHistory = isSuper || isMaster;

  return (
    <header className="navbar-responsive">
      <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", padding: "1rem 0" }}>
        <div className="navbar-grid">
          <div 
            className="navbar-logo" 
            onClick={() => {
              router.push("/");
            }}
            title="Ir a página principal"
            style={{ cursor: "pointer" }}
          >
            <img 
              src={isDark ? "/images/LuckyLy-Logo-BLANCO-SIN-FONDO.png" : "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png"} 
              alt="LuckyLY Logo"
            />
          </div>
          <nav className="navbar-nav">
            <Link href="/admin" style={{ padding: ".5rem 1rem", borderRadius: "8px", background: "var(--color-primary)", color: "#ffffff", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", position: "relative" }}>
              Dashboard
              {(stats?.total ?? 0) > 0 && <NotificationBadge count={stats!.total} className="-top-2 -right-2" />}
            </Link>
          </nav>
          
          <div className="navbar-actions">
            <button
              onClick={toggleTheme}
              className="theme-toggle-button"
              title={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
            >
              {isDark ? "☀️" : "🌙"}
            </button>
            <button
              onClick={logout}
              className="admin-logout-button"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
