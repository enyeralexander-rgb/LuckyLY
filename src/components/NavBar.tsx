 "use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { clearStoredAuth, getStoredAuth } from "../lib/clientAuth";
import { useRouter } from "next/navigation";

export function NavBar() {
  const router = useRouter();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
            // Actualizar auth con username actualizado
            if (data.username) {
              setAuth({ ...storedAuth, user: { ...storedAuth.user, username: data.username } });
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Escuchar cambios en el username desde otras páginas
  useEffect(() => {
    const handleStorageChange = () => {
      const storedAuth = getStoredAuth();
      if (storedAuth?.token) {
        fetch("/api/user/profile", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) {
              setUserData(data);
              setAuth({ ...storedAuth, user: { ...storedAuth.user, username: data.username } });
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // También escuchar eventos personalizados
    window.addEventListener("usernameUpdated", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("usernameUpdated", handleStorageChange);
    };
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      clearStoredAuth();
      setAuth(null);
      // Forzar recarga para limpiar cualquier estado en caché
      window.location.href = "/auth/login";
    }
  }

  return (
    <header style={{ borderBottom: "1px solid #d0fdd7", background: "#ffffff" }}>
      <div className="container" style={{ display: "flex", alignItems: "center", gap: "1rem", justifyContent: "center", padding: "1rem 0" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "2rem", width: "100%", maxWidth: "1200px" }}>
          <div style={{ cursor: "pointer", display: "flex", alignItems: "center", height: "37.5px", justifySelf: "start" }} onClick={() => router.push("/")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo" 
              style={{ height: "100%", width: "auto", maxWidth: "150px", objectFit: "contain", display: "block" }}
            />
          </div>
          <nav style={{ display: "flex", gap: "1.5rem", alignItems: "center", justifyContent: "center", gridColumn: "2" }}>
            <Link href="/" style={{ textDecoration: "none", color: "#1a5c2e", fontWeight: 500, textTransform: "uppercase" }}>Inicio</Link>
            <Link href="/live" style={{ textDecoration: "none", color: "#1a5c2e", fontWeight: 500, textTransform: "uppercase" }}>En Vivo</Link>
            <Link href="/results" style={{ textDecoration: "none", color: "#1a5c2e", fontWeight: 500, textTransform: "uppercase" }}>Resultados</Link>
          </nav>
          <div style={{ display: "flex", gap: ".75rem", alignItems: "center", justifySelf: "end", gridColumn: "3" }}>
            {!mounted || !auth ? (
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
                  onClick={() => setMenuOpen((v) => !v)}
                  style={{
                    padding: ".5rem .75rem",
                    borderRadius: "999px",
                    border: "1px solid #d0fdd7",
                    background: "#e8f5eb",
                    color: "#1a5c2e",
                    cursor: "pointer"
                  }}
                >
                  👤 {userData?.username || auth.user.username || auth.user.email.split("@")[0]}
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

