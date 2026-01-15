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
    <header style={{ borderBottom: "1px solid #d4d4c4", background: "#f5f5e6" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", padding: "1rem 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "1200px" }}>
          <div style={{ cursor: "pointer", display: "flex", alignItems: "center", height: "37.5px", justifySelf: "start" }} onClick={() => router.push("/admin")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo" 
              style={{ height: "100%", width: "auto", maxWidth: "150px", objectFit: "contain", display: "block" }}
            />
          </div>
          <nav style={{ display: "flex", gap: "1rem", alignItems: "center", justifyContent: "center", gridColumn: "2" }}>
            <Link href="/admin" style={{ padding: ".5rem 1rem", borderRadius: "8px", background: "#85BB65", color: "#ffffff", fontWeight: 700, textDecoration: "none", textTransform: "uppercase" }}>
              Dashboard
            </Link>
          </nav>
          <div style={{ display: "flex", alignItems: "center", justifySelf: "end", gridColumn: "3" }}>
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
