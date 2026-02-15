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

  useEffect(() => {
    setMounted(true);
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    
    // Cargar datos del usuario si está autenticado
    if (storedAuth?.token) {
      const role = storedAuth.user?.role;
      if (role === "USER") {
        fetch("/api/user/profile", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) {
              setUserData(data);
            }
          })
          .catch(() => {});
      } else {
        setUserData(storedAuth.user || null);
      }
    }
  }, [pathname]);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      clearStoredAuth();
      setAuth(null);
      setUserData(null);
      window.location.href = "/";
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
      clearStoredAuth();
      setAuth(null);
      setUserData(null);
      window.location.href = "/";
    }
  }

  if (!mounted) {
    return null;
  }

  const role = auth?.user?.role as UserRole | undefined;
  const isAdmin = role && ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(role);
  const isClient = role === "USER" || !role;

  // Menú para clientes (USER) - Incluye navegación y opciones de cuenta
  const clientMenu: UserMenu[] = [
    { label: "NAVEGACIÓN", href: "#section", icon: "🧭", divider: true },
    { label: "Inicio", href: "/", icon: "🏠" },
    { label: "Sorteos", href: "/raffles", icon: "🎲" },
    { label: "En Vivo", href: "/live", icon: "📺" },
    { label: "Resultados", href: "/results", icon: "🏆" },
    { label: "MI CUENTA", href: "/cuenta", icon: "👤", divider: true },
    { label: "Configuración", href: "/cuenta/configuracion", icon: "⚙️" },
    { label: "Historial de Apuestas", href: "/cuenta/historial", icon: "🎲" },
    { label: "Datos Bancarios", href: "/cuenta/datos-bancarios", icon: "🏦", divider: true },
    { label: "Cerrar Sesión", href: "#", icon: "🚪" },
  ];

  // Menú para administradores - Incluye navegación y opciones de admin
  const getAdminMenu = (): UserMenu[] => {
    const menu: UserMenu[] = [
      { label: "NAVEGACIÓN", href: "#section", icon: "🧭", divider: true },
      { label: "Inicio", href: "/", icon: "🏠" },
      { label: "En Vivo", href: "/live", icon: "📺" },
      { label: "Resultados", href: "/results", icon: "🏆" },
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
      menu.push({ label: "Pago Móvil", href: "/admin/pago-movil", icon: "💳" });
      menu.push({ label: "Redes Sociales", href: "/admin/redes-sociales", icon: "📱" });
      menu.push({ label: "En vivo", href: "/admin/en-vivo", icon: "📺" });
      menu.push({ label: "Estadísticas Usuario", href: "/admin/estadisticas/user", icon: "📊" });
    }

    menu.push({ label: "Cerrar sesión", href: "#", icon: "🚪", divider: true });
    return menu;
  };

  const displayName = userData?.username || auth?.user?.username || auth?.user?.email?.split("@")[0] || "Usuario";
  const currentMenu = isAdmin ? getAdminMenu() : clientMenu;


  return (
    <header className="header-responsive">
      <div className="header-container">
        <div className="header-grid-simple">
          {/* Logo a la izquierda */}
          <div className="header-logo-left" onClick={() => router.push("/")}>
            <img 
              src="/images/LuckyLy-Logo.png" 
              alt="LuckyLY Logo"
              className="header-logo-image"
            />
          </div>

          {/* Botón de usuario a la derecha con menú desplegable */}
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
                      if (item.href === "#section") {
                        return (
                          <div key={index} className="header-dropdown-section">
                            {item.icon && <span>{item.icon}</span>}
                            <span>{item.label}</span>
                          </div>
                        );
                      }
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
        </div>
      </div>
    </header>
  );
}
