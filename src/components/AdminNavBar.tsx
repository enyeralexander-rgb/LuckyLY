"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearStoredAuth, getStoredAuth } from "../lib/clientAuth";
import { useEffect, useState } from "react";

export function AdminNavBar() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

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
    <header className="navbar-responsive" style={{ borderBottom: "1px solid #d4d4c4", background: "#f5f5e6" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", padding: "1rem 0" }}>
        <div className="navbar-grid">
          <div className="navbar-logo" onClick={() => router.push("/admin")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo"
            />
          </div>
          <nav className="navbar-nav">
            <Link href="/admin" style={{ padding: ".5rem 1rem", borderRadius: "8px", background: "#85BB65", color: "#ffffff", fontWeight: 700, textDecoration: "none", textTransform: "uppercase" }}>
              Dashboard
            </Link>
          </nav>
          <div className="navbar-actions">
            <button
              onClick={logout}
              style={{ padding: ".5rem .75rem", borderRadius: "8px", border: "1px solid #d4d4c4", background: "#f5f5e6", color: "#3E3E3C", cursor: "pointer" }}
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
