"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { getStoredAuth, clearStoredAuth } from "../../lib/clientAuth";
import { useRouter, usePathname } from "next/navigation";
import { useTheme } from "../../hooks/useTheme";
import { useTutorial } from "../../contexts/TutorialContext";

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
  const { isDark, toggleTheme } = useTheme();
  const tutorial = useTutorial();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

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
      
      // Cargar notificaciones no leídas (solo para usuarios regulares)
      if (storedAuth.user?.role === "USER") {
        fetch("/api/user/notifications?unreadOnly=true", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (!data.error && Array.isArray(data)) {
              setUnreadNotifications(data.length);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  // Cerrar menús al cambiar de ruta
  useEffect(() => {
    setUserMenuOpen(false);
  }, [pathname]);

  // Cerrar menú desplegable al hacer clic fuera (no cerrar en paso 2 del tutorial)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tutorial?.step === 2) return;
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    }

    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [userMenuOpen, tutorial?.step]);

  useEffect(() => {
    tutorial?.onMenuOpenChange(userMenuOpen);
  }, [userMenuOpen, tutorial]);

  // Ocultar header en rutas de administración
  if (pathname?.startsWith("/admin")) {
    return null;
  }

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
    { label: isDark ? "Modo Claro" : "Modo Oscuro", href: "#theme", icon: isDark ? "☀️" : "🌙" },
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
      menu.push({ label: "Reglas", href: "/admin/reglas", icon: "📋" });
      menu.push({ label: "Pago Móvil", href: "/admin/pago-movil", icon: "💳" });
      menu.push({ label: "Redes Sociales", href: "/admin/redes-sociales", icon: "📱" });
    }

    menu.push({ label: isDark ? "Modo Claro" : "Modo Oscuro", href: "#theme", icon: isDark ? "☀️" : "🌙", divider: true });
    menu.push({ label: "Cerrar sesión", href: "#", icon: "🚪" });
    return menu;
  };

  // Menú público para usuarios no logueados
  const publicMenu: UserMenu[] = [
    { label: "NAVEGACIÓN", href: "#section", icon: "🧭", divider: true },
    { label: "Inicio", href: "/", icon: "🏠" },
    { label: "Sorteos", href: "/raffles", icon: "🎲" },
    { label: "En Vivo", href: "/live", icon: "📺" },
    { label: "Resultados", href: "/results", icon: "🏆" },
    { label: isDark ? "Modo Claro" : "Modo Oscuro", href: "#theme", icon: isDark ? "☀️" : "🌙", divider: true },
  ];

  const displayName = userData?.username || auth?.user?.username || auth?.user?.email?.split("@")[0] || "Usuario";
  const currentMenu = isAdmin ? getAdminMenu() : (auth ? clientMenu : publicMenu);

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
              <div className="header-user-dropdown-container" ref={menuRef}>
                <button
                  ref={tutorial?.menuButtonRef as React.RefObject<HTMLButtonElement | null>}
                  className={`header-user-dropdown-button ${tutorial?.step === 1 ? "tutorial-highlight-menu" : ""}`}
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label="Menú"
                >
                  <span className="header-menu-icon-simple">☰</span>
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
                      if (item.href === "#theme") {
                        return (
                          <button
                            key={index}
                            onClick={toggleTheme}
                            className={`header-dropdown-item ${item.divider ? "header-dropdown-divider" : ""}`}
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
                    {/* Agregar botones de login/registro para usuarios no autenticados */}
                    <div className="header-dropdown-section">
                      <span>🔐</span>
                      <span>CUENTA</span>
                    </div>
                    <Link
                      href="/auth/login"
                      onClick={() => setUserMenuOpen(false)}
                      className="header-dropdown-item"
                    >
                      <span>🔑</span>
                      <span>Ingresar</span>
                    </Link>
                    <Link
                      ref={tutorial?.registerLinkRef as React.RefObject<HTMLAnchorElement | null>}
                      href="/auth/register"
                      onClick={() => setUserMenuOpen(false)}
                      className={`header-dropdown-item header-dropdown-register ${tutorial?.step === 2 ? "tutorial-highlight-register" : ""}`}
                    >
                      <span>📝</span>
                      <span>Registrarse</span>
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="header-user-dropdown-container" ref={menuRef}>
                <button
                  className="header-user-dropdown-button"
                  onClick={() => setUserMenuOpen((v) => !v)}
                  aria-label={isAdmin ? "Panel de administración" : "Mi cuenta"}
                >
                  <span className="header-user-icon">
                    {isAdmin ? "👑" : "👤"}
                  </span>
                  <span className="header-user-name">{displayName}</span>
                  {/* Indicador de notificaciones */}
                  {!isAdmin && unreadNotifications > 0 && (
                    <span className="header-notification-badge">
                      {unreadNotifications > 9 ? "9+" : unreadNotifications}
                    </span>
                  )}
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
                      if (item.href === "#theme") {
                        return (
                          <button
                            key={index}
                            onClick={toggleTheme}
                            className={`header-dropdown-item ${item.divider ? "header-dropdown-divider" : ""}`}
                          >
                            {item.icon && <span>{item.icon}</span>}
                            <span>{item.label}</span>
                          </button>
                        );
                      }
                      // Mostrar badge de notificación en Historial de Apuestas
                      const showNotificationBadge = item.href === "/cuenta/historial" && !isAdmin && unreadNotifications > 0;
                      return (
                        <Link
                          key={index}
                          href={item.href}
                          onClick={() => setUserMenuOpen(false)}
                          className={`header-dropdown-item ${item.divider ? "header-dropdown-divider" : ""}`}
                        >
                          {item.icon && <span>{item.icon}</span>}
                          <span>{item.label}</span>
                          {showNotificationBadge && (
                            <span className="header-menu-notification-badge">
                              {unreadNotifications > 9 ? "9+" : unreadNotifications}
                            </span>
                          )}
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
