"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  PlusCircle,
  PlayCircle,
  CheckSquare,
  Banknote,
  Users,
  History,
  UserPlus,
  Layout,
  Radio,
  FileText,
  HelpCircle,
  Smartphone,
  Share2,
  BarChart3,
  ShieldCheck,
  ScrollText,
  UserCog,
} from "lucide-react";
import { AdminNavBar } from "../../../components/AdminNavBar";
import { AdminFooter } from "../../../components/AdminFooter";
import { AuthGuard } from "../../../components/AuthGuard";
import { getStoredAuth } from "../../../lib/clientAuth";
import { NotificationBadge } from "../../../components/ui/NotificationBadge";
import { useNotificationStats } from "../../../hooks/useNotificationStats";

const DASHBOARD_VIEW_KEY = "admin-dashboard-view";
type DashboardViewPreference = "compact" | "classic";

function getStoredView(): DashboardViewPreference {
  if (typeof window === "undefined") return "compact";
  const stored = localStorage.getItem(DASHBOARD_VIEW_KEY);
  if (stored === "classic" || stored === "compact") return stored;
  const legacy = localStorage.getItem("admin-dashboard-icon-size");
  if (legacy === "large") return "classic";
  return "compact";
}

type RoleFilter = "ALL" | "AGENT" | "CONTABLE" | "SUPERADMIN" | "MASTER";

interface DashboardItem {
  href: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  roles: RoleFilter[];
  badgeKey?: "readyToExecute" | "pendingSlots" | "pendingClaims";
}

const DASHBOARD_ITEMS: DashboardItem[] = [
  {
    href: "/admin/sorteos/crear",
    title: "Crear Sorteos",
    description: "Configura y abre nuevos sorteos con diferentes tipos de ruletas, precios, premios y fechas de ejecución.",
    icon: PlusCircle,
    roles: ["AGENT", "SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/sorteos/ejecutar",
    title: "Ejecutar Sorteos",
    description: "Gira la ruleta animada para determinar los ganadores de sorteos con todos los cupos comprados.",
    icon: PlayCircle,
    roles: ["AGENT", "SUPERADMIN", "MASTER"],
    badgeKey: "readyToExecute",
  },
  {
    href: "/admin/sorteos/cupos",
    title: "Confirmar Cupos",
    description: "Revisa y confirma o rechaza cupos pendientes de pago móvil de forma individual.",
    icon: CheckSquare,
    roles: ["ALL"],
    badgeKey: "pendingSlots",
  },
  {
    href: "/admin/pagos",
    title: "Pagar Premios",
    description: "Procesa reclamos de premios, revisa datos bancarios y confirma pagos realizados.",
    icon: Banknote,
    roles: ["ALL"],
    badgeKey: "pendingClaims",
  },
  {
    href: "/admin/usuarios",
    title: "Datos de Usuarios",
    description: "Consulta información de usuarios registrados, datos bancarios y datos de contacto.",
    icon: Users,
    roles: ["SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/historial",
    title: "Historial de Dinámicas",
    description: "Consulta el historial completo de sorteos ejecutados con filtros por fecha y tipo.",
    icon: History,
    roles: ["SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/referidos",
    title: "Referidos",
    description: "Genera links de referidos para atraer clientes y rastrea ingresos por cada link generado.",
    icon: UserPlus,
    roles: ["SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/pagina-principal",
    title: "Página Principal",
    description: "Configura el carrusel de imágenes y videos de la portada principal con opciones gráficas avanzadas.",
    icon: Layout,
    roles: ["SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/en-vivo",
    title: "En vivo",
    description: "Configura el enlace del reproductor (canal) y el chat en vivo que se muestran en la sección /live.",
    icon: Radio,
    roles: ["SUPERADMIN", "MASTER"],
  },
  {
    href: "/admin/terminos",
    title: "Términos y Condiciones",
    description: "Edita el contenido de términos y condiciones que se muestran a los usuarios.",
    icon: FileText,
    roles: ["MASTER"],
  },
  {
    href: "/admin/faq",
    title: "Preguntas Frecuentes",
    description: "Gestiona las preguntas frecuentes que se muestran en la página /faq.",
    icon: HelpCircle,
    roles: ["MASTER"],
  },
  {
    href: "/admin/pago-movil",
    title: "Pago Móvil",
    description: "Configura la imagen y datos (Cédula, Teléfono, Destino) de pago móvil para mostrar a los usuarios.",
    icon: Smartphone,
    roles: ["MASTER"],
  },
  {
    href: "/admin/redes-sociales",
    title: "Redes Sociales",
    description: "Gestiona los enlaces de redes sociales que se muestran en el pie de página.",
    icon: Share2,
    roles: ["MASTER"],
  },
  {
    href: "/admin/estadisticas",
    title: "Estadísticas",
    description: "Visualiza estadísticas de ingresos, referencias y usuarios con gráficos interactivos.",
    icon: BarChart3,
    roles: ["CONTABLE", "MASTER"],
  },
  {
    href: "/admin/logs-admins",
    title: "Logs de Administradores",
    description: "Consulta el registro global de todas las acciones realizadas por administradores de todos los roles.",
    icon: ScrollText,
    roles: ["MASTER"],
  },
  {
    href: "/admin/roles/admins",
    title: "Gestionar Administradores",
    description: "Crea, modifica roles/permisos o elimina usuarios administradores de todos los roles (AGENT, SUPERADMIN, CONTABLE).",
    icon: UserCog,
    roles: ["MASTER"],
  },
  {
    href: "/admin/2fa",
    title: "2FA",
    description: "Configura autenticación de dos factores para mayor seguridad en tu cuenta.",
    icon: ShieldCheck,
    roles: ["ALL"],
  },
];

function DashboardCard({
  item,
  badgeCount,
  isVisible,
  viewMode,
}: {
  item: DashboardItem;
  badgeCount?: number;
  isVisible: boolean;
  viewMode: DashboardViewPreference;
}) {
  const [hover, setHover] = useState(false);
  if (!isVisible) return null;

  if (viewMode === "classic") {
    return (
      <Link
        href={item.href}
        className="card relative"
        style={{
          padding: "2rem",
          textDecoration: "none",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          transition: "transform 0.2s",
          cursor: "pointer",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-4px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        {item.badgeKey && badgeCount !== undefined && badgeCount > 0 && (
          <NotificationBadge count={badgeCount} />
        )}
        <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>
          {item.title}
        </h3>
        <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: 1.5, opacity: 0.8 }}>
          {item.description}
        </p>
      </Link>
    );
  }

  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className="card relative"
      style={{
        padding: "0.6rem 1.25rem",
        textDecoration: "none",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
        minHeight: "100px",
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hover ? "0 8px 24px rgba(0,0,0,0.12)" : undefined,
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {item.badgeKey && badgeCount !== undefined && badgeCount > 0 && (
        <NotificationBadge count={badgeCount} className="admin-dashboard-card-badge" />
      )}
      <div style={{ color: "var(--accent, #6366f1)" }}>
        <Icon size={28} />
      </div>
      <span
        style={{
          margin: 0,
          fontSize: "0.9rem",
          fontWeight: 600,
          color: "var(--text-primary)",
          textAlign: "center",
          lineHeight: 1.2,
        }}
      >
        {item.title}
      </span>
      {hover && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "100%",
            left: "50%",
            transform: "translateX(-50%) translateY(-12px)",
            padding: "0.75rem 1rem",
            background: "var(--card-bg, #1e1e2e)",
            color: "var(--text-primary)",
            fontSize: "0.8rem",
            lineHeight: 1.4,
            borderRadius: "8px",
            boxShadow: "0 4px 20px rgba(0,0,0,0.25)",
            maxWidth: "260px",
            width: "max-content",
            zIndex: 10,
            border: "1px solid var(--border, rgba(255,255,255,0.08))",
          }}
        >
          {item.description}
          <span
            style={{
              position: "absolute",
              bottom: "-6px",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "6px solid transparent",
              borderRight: "6px solid transparent",
              borderTop: "6px solid var(--card-bg, #1e1e2e)",
            }}
          />
        </div>
      )}
    </Link>
  );
}

const DASHBOARD_LOADING = (
  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh", color: "var(--text-primary)", opacity: 0.8 }}>
    Cargando dashboard...
  </div>
);

function AdminHomePageContent() {
  const [role, setRole] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<DashboardViewPreference>("compact");
  const { stats } = useNotificationStats();

  useEffect(() => {
    setViewMode(getStoredView());
  }, []);

  const handleViewChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next: DashboardViewPreference = e.target.checked ? "classic" : "compact";
    setViewMode(next);
    localStorage.setItem(DASHBOARD_VIEW_KEY, next);
  };

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      window.location.href = "/auth/login";
      return;
    }
    setRole(auth.user.role ?? null);
  }, []);

  // Fallback: si el rol sigue null (p. ej. condición de carrera con AuthGuard), reintentar tras sincronización
  useEffect(() => {
    if (role !== null) return;
    const t = setTimeout(() => {
      const auth = getStoredAuth();
      if (auth?.user?.role) setRole(auth.user.role);
    }, 300);
    return () => clearTimeout(t);
  }, [role]);

  if (role === null) {
    return (
      <>
        <AdminNavBar />
        <main className="container admin-main-with-footer" style={{ paddingTop: "2rem" }}>
          {DASHBOARD_LOADING}
        </main>
        <AdminFooter />
      </>
    );
  }

  const isVisible = (item: DashboardItem) => {
    if (item.roles.includes("ALL")) return true;
    return item.roles.includes(role as RoleFilter);
  };

  const getBadgeCount = (key: DashboardItem["badgeKey"]) => {
    if (!key || !stats) return undefined;
    if (key === "readyToExecute") return stats.readyToExecute ?? 0;
    if (key === "pendingSlots") return stats.pendingSlots ?? 0;
    if (key === "pendingClaims") return stats.pendingClaims ?? 0;
    return undefined;
  };

  return (
    <>
      <AdminNavBar />
      <main className="container admin-main-with-footer admin-dashboard-main">
        <div className="admin-dashboard-header-row">
          <div className="admin-dashboard-heading">
            <h1 className="admin-dashboard-title">Dashboard</h1>
            <h2 className="admin-dashboard-subtitle">Módulos de Administración</h2>
          </div>
          <label className="admin-dashboard-icon-size-switch">
            <span className="admin-dashboard-icon-size-label">Vista clásica</span>
            <input
              type="checkbox"
              checked={viewMode === "classic"}
              onChange={handleViewChange}
              aria-label="Ver dashboard con título y descripción en cada tarjeta, sin iconos ni popup"
            />
          </label>
        </div>
        <section className="admin-dashboard-section">
          <div
            className={`admin-dashboard-grid ${viewMode === "classic" ? "admin-dashboard-grid--classic" : ""}`}
            style={{ gap: "1rem" }}
          >
            {DASHBOARD_ITEMS.map((item) => (
              <DashboardCard
                key={item.href}
                item={item}
                badgeCount={item.badgeKey ? getBadgeCount(item.badgeKey) : undefined}
                isVisible={isVisible(item)}
                viewMode={viewMode}
              />
            ))}
          </div>
        </section>
      </main>
      <AdminFooter />
    </>
  );
}

export default function AdminHomePage() {
  return (
    <AuthGuard requiredRole={["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"]}>
      <AdminHomePageContent />
    </AuthGuard>
  );
}
