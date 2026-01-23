"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuth, clearStoredAuth } from "../lib/clientAuth";
import { useRouter, usePathname } from "next/navigation";

type UserRole = "USER" | "AGENT" | "CONTABLE" | "SUPERADMIN" | "MASTER";

interface UserMenu {
  label: string;
  href: string;
  icon?: string;
  divider?: boolean;
}

export function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
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

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setUserMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

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

  const role = auth?.user?.role as UserRole | undefined;
  const isAdmin = role && ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(role);
  const isClient = role === "USER" || !role;

  // Menú para clientes (USER)
  const clientMenu: UserMenu[] = [
    { label: "MI CUENTA", href: "/cuenta", icon: "👤", divider: true },
    { label: "Configuración", href: "/cuenta/configuracion", icon: "⚙️" },
    { label: "Historial de Apuestas", href: "/cuenta/historial", icon: "🎲" },
    { label: "Datos Bancarios", href: "/cuenta/datos-bancarios", icon: "🏦", divider: true },
    { label: "Cerrar Sesión", href: "#", icon: "🚪" },
  ];

  // Menú para administradores
  const getAdminMenu = (): UserMenu[] => {
    const menu: UserMenu[] = [
      { label: "DASHBOARD", href: "/admin", icon: "📊", divider: true },
    ];

    // AGENT puede ver:
    if (["AGENT", "SUPERADMIN", "MASTER"].includes(role || "")) {
      menu.push({ label: "Página Principal", href: "/admin/pagina-principal", icon: "🏠" });
    }

    // CONTABLE puede ver:
    if (["CONTABLE", "MASTER"].includes(role || "")) {
      menu.push({ label: "Estadísticas", href: "/admin/estadisticas", icon: "📈" });
      menu.push({ label: "Pagar Premios", href: "/admin/pagos", icon: "💰" });
    }

    // SUPERADMIN y MASTER pueden ver:
    if (["SUPERADMIN", "MASTER"].includes(role || "")) {
      menu.push({ label: "Usuarios", href: "/admin/usuarios", icon: "👥" });
      menu.push({ label: "Historial", href: "/admin/historial", icon: "📜" });
      menu.push({ label: "Referidos", href: "/admin/referidos", icon: "🔗" });
    }

    // Solo MASTER puede ver:
    if (role === "MASTER") {
      menu.push({ label: "Super Admins", href: "/admin/roles/superadmins", icon: "👑" });
      menu.push({ label: "Administradores", href: "/admin/roles/admins", icon: "🛡️" });
      menu.push({ label: "Logs Super Admins", href: "/admin/logs-super", icon: "📋" });
      menu.push({ label: "Logs Administradores", href: "/admin/logs-admins", icon: "📋" });
      menu.push({ label: "Términos y Condiciones", href: "/admin/terminos", icon: "📄" });
      menu.push({ label: "Reglas", href: "/admin/reglas", icon: "📋" });
      menu.push({ label: "Pago Móvil", href: "/admin/pago-movil", icon: "💳" });
      menu.push({ label: "Redes Sociales", href: "/admin/redes-sociales", icon: "📱" });
      menu.push({ label: "Estadísticas Usuario", href: "/admin/estadisticas/user", icon: "📊" });
    }

    menu.push({ label: "Cerrar sesión", href: "#", icon: "🚪", divider: true });
    return menu;
  };

  const displayName = userData?.username || auth?.user?.username || auth?.user?.email?.split("@")[0] || "Usuario";
  const currentMenu = isAdmin ? getAdminMenu() : clientMenu;

  // Menú público para usuarios no logueados
  const publicMenu: UserMenu[] = [
    { label: "NAVEGACIÓN", href: "/", icon: "🏠", divider: true },
    { label: "Inicio", href: "/", icon: "🏠" },
    { label: "Sorteos", href: "/raffles", icon: "🎲" },
    { label: "En Vivo", href: "/live", icon: "📺" },
    { label: "Resultados", href: "/results", icon: "🏆" },
  ];

  // Menú principal según estado de autenticación
  const mainMenu = !auth ? publicMenu : currentMenu;

  return (
    <header className="header-responsive">
      <div className="header-container">
        <div className="header-grid">
          {/* Navegación principal a la izquierda */}
          <nav className="header-nav-left">
            <Link href="/" className="header-nav-link">Inicio</Link>
            <Link href="/live" className="header-nav-link">En Vivo</Link>
            <Link href="/results" className="header-nav-link">Resultados</Link>
          </nav>

          {/* Logo centrado */}
          <div className="header-logo-center" onClick={() => router.push("/")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo"
              className="header-logo-image"
            />
          </div>

          {/* Botones de login/registro o menú de usuario a la derecha */}
          <div className="header-actions">
            {!auth ? (
              <>
                <Link href="/auth/login" className="header-link">Ingresar</Link>
                <Link href="/auth/register" className="header-button">
                  Registrarse
                </Link>
              </>
            ) : (
              <div className="header-user-dropdown-container">
                <button
                  className="header-user-dropdown-button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label={isAdmin ? "Panel de administración" : "Mi cuenta"}
                >
                  <span className="header-user-icon">
                    {isAdmin ? "👑" : "👤"}
                  </span>
                  <span className="header-user-name">{displayName}</span>
                  <span className="header-dropdown-arrow">{userMenuOpen ? "▲" : "▼"}</span>
                </button>
                {userMenuOpen && (
                  <div className="header-user-dropdown">
                    {currentMenu.map((item, index) => {
                      if (item.href === "#") {
                        return (
                          <button
                            key={index}
                            onClick={logout}
                            className="header-dropdown-item header-dropdown-logout"
                          >
                            {item.icon && <span>{item.icon}</span>}
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      return (
                        <Link
                          key={index}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className={`header-dropdown-item ${item.divider ? "header-dropdown-divider" : ""}`}
                        >
                          {item.icon && <span>{item.icon}</span>}
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Menú móvil hamburguesa (solo para móviles) */}
          <button
            className="header-mobile-menu"
            onClick={() => setMobileMenuOpen((v) => !v)}
            aria-label="Menú móvil"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          {/* Navegación móvil */}
          {mobileMenuOpen && (
            <nav className="header-nav-mobile">
              {mainMenu.map((item, index) => {
                if (item.href === "#") {
                  return (
                    <button
                      key={index}
                      onClick={logout}
                      className="header-mobile-item header-mobile-button"
                    >
                      {item.icon && <span>{item.icon}</span>}
                      <span>{item.label}</span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={index}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="header-mobile-item"
                  >
                    {item.icon && <span>{item.icon}</span>}
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          )}
        </div>
      </div>
    </header>
  );
}
