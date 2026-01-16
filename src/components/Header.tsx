"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuth, clearStoredAuth } from "../lib/clientAuth";
import { useRouter } from "next/navigation";

export function Header() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    
    // Cargar datos del usuario si está autenticado
    if (storedAuth?.token) {
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setUserData(data);
          }
        })
        .catch(() => {});
    }
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearStoredAuth();
      setAuth(null);
      setUserData(null);
      window.location.href = "/auth/login";
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      clearStoredAuth();
      setAuth(null);
      setUserData(null);
      window.location.href = "/auth/login";
    }
  }

  if (!mounted) {
    return null;
  }

  return (
    <header className="header-responsive">
      <div className="header-container">
        <div className="header-grid">
          <div className="header-logo" onClick={() => router.push("/")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          </div>
          
          <nav className="header-nav">
            <Link href="/">Inicio</Link>
            <Link href="/raffles">Sorteos</Link>
            <Link href="/live">En Vivo</Link>
            <Link href="/results">Resultados</Link>
          </nav>
          
          <button
            className="header-mobile-menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menú"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>
          
          <nav className={`header-nav-mobile ${mobileMenuOpen ? 'show' : ''}`}>
            <Link href="/" onClick={() => setMobileMenuOpen(false)}>Inicio</Link>
            <Link href="/raffles" onClick={() => setMobileMenuOpen(false)}>Sorteos</Link>
            <Link href="/live" onClick={() => setMobileMenuOpen(false)}>En Vivo</Link>
            <Link href="/results" onClick={() => setMobileMenuOpen(false)}>Resultados</Link>
          </nav>
          
          <div className="header-actions">
            {!auth ? (
              <>
                <Link href="/auth/login" style={{ textDecoration: "none", color: "#1a5c2e", fontWeight: 500, textTransform: "uppercase" }}>Ingresar</Link>
                <Link href="/auth/register" style={{ padding: ".5rem .75rem", background: "#2a8c4a", color: "#ffffff", borderRadius: "8px", fontWeight: 700, textDecoration: "none", textTransform: "uppercase", transition: "background 0.2s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#3a9c5a"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "#2a8c4a"}>
                  Registrarse
                </Link>
              </>
            ) : (
              <div style={{ position: "relative" }}>
                <button
                  className="header-menu-button"
                  onClick={() => setMenuOpen((v) => !v)}
                >
                  👤 {userData?.username || auth.user?.username || auth.user?.email?.split("@")[0] || "Usuario"}
                </button>
                {menuOpen && (
                  <div
                    style={{
                      position: "absolute",
                      right: 0,
                      marginTop: ".5rem",
                      background: "#ffffff",
                      border: "1px solid #d0fdd7",
                      boxShadow: "0 4px 12px rgba(42, 140, 74, 0.15)",
                      borderRadius: "10px",
                      minWidth: "200px",
                      zIndex: 10
                    }}
                  >
                    <Link href="/cuenta" style={{ display: "block", padding: ".75rem 1rem", color: "#1a5c2e", textTransform: "uppercase", borderBottom: "1px solid #d0fdd7" }} onClick={() => setMenuOpen(false)}>
                      MI CUENTA
                    </Link>
                    <Link href="/cuenta/configuracion" style={{ display: "block", padding: ".75rem 1rem", color: "#2a8c4a", fontSize: "0.875rem" }} onClick={() => setMenuOpen(false)}>
                      ⚙️ Configuración
                    </Link>
                    <Link href="/cuenta/favoritos" style={{ display: "block", padding: ".75rem 1rem", color: "#2a8c4a", fontSize: "0.875rem" }} onClick={() => setMenuOpen(false)}>
                      ⭐ Mis Favoritos
                    </Link>
                    <Link href="/cuenta/mis-jugadas" style={{ display: "block", padding: ".75rem 1rem", color: "#2a8c4a", fontSize: "0.875rem" }} onClick={() => setMenuOpen(false)}>
                      🎲 Tickets y Notificaciones
                    </Link>
                    <Link href="/cuenta/historial" style={{ display: "block", padding: ".75rem 1rem", color: "#2a8c4a", fontSize: "0.875rem" }} onClick={() => setMenuOpen(false)}>
                      📜 Historial
                    </Link>
                    <Link href="/cuenta/datos-bancarios" style={{ display: "block", padding: ".75rem 1rem", color: "#2a8c4a", fontSize: "0.875rem", borderBottom: "1px solid #d0fdd7" }} onClick={() => setMenuOpen(false)}>
                      🏦 Datos Bancarios
                    </Link>
                    <button
                      onClick={logout}
                      style={{
                        display: "block",
                        width: "100%",
                        padding: ".75rem 1rem",
                        border: "none",
                        background: "transparent",
                        color: "#1a5c2e",
                        textAlign: "left",
                        cursor: "pointer",
                        textTransform: "uppercase"
                      }}
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
