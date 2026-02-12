"use client";
import { useEffect, useState } from "react";
import { AdminNavBar } from "../../../components/AdminNavBar";
import { AdminFooter } from "../../../components/AdminFooter";
import { AuthGuard } from "../../../components/AuthGuard";
import { getStoredAuth } from "../../../lib/clientAuth";
import Link from "next/link";

import { NotificationBadge } from "../../../components/ui/NotificationBadge";
import { useNotificationStats } from "../../../hooks/useNotificationStats";

function AdminHomePageContent() {
  const [role, setRole] = useState<string | null>(null);
  const { stats } = useNotificationStats();

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      window.location.href = "/auth/login";
      return;
    }
    setRole(auth.user.role ?? null);
  }, []);

  const isAgent = role === "AGENT";
  const isContable = role === "CONTABLE";
  const isSuper = role === "SUPERADMIN";
  const isMaster = role === "MASTER";

  return (
    <>
      <AdminNavBar />
      <main className="container admin-main-with-footer" style={{ paddingTop: "2rem", display: "grid", gap: "1.5rem" }}>
        <h1 style={{ color: "var(--text-primary)" }}>Dashboard</h1>

        <section style={{ display: "grid", gap: "1.5rem" }}>
          <h2 style={{ margin: 0, color: "var(--text-primary)" }}>Módulos de Administración</h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1.5rem" }}>
            {/* Módulos Operativos - Todos los roles excepto CONTABLE */}
            {!isContable && (
              <>
                <Link href="/admin/sorteos/crear" className="card relative" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Crear Sorteos</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Configura y abre nuevos sorteos con diferentes tipos de ruletas, precios, premios y fechas de ejecución.</p>
                </Link>

                <Link href="/admin/sorteos/ejecutar" className="card relative" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <NotificationBadge count={stats?.readyToExecute || 0} />
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Ejecutar Sorteos</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Gira la ruleta animada para determinar los ganadores de sorteos con todos los cupos comprados.</p>
                </Link>
              </>
            )}

            {/* Módulos Operativos - Confirmar Cupos y Pagar Premios (todos los roles incluyendo CONTABLE) */}
            <Link href="/admin/sorteos/cupos" className="card relative" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <NotificationBadge count={stats?.pendingSlots || 0} />
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Confirmar Cupos</h3>
              <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Revisa y confirma o rechaza cupos pendientes de pago móvil de forma individual.</p>
            </Link>

            <Link href="/admin/pagos" className="card relative" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <NotificationBadge count={stats?.pendingClaims || 0} />
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Pagar Premios</h3>
              <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Procesa reclamos de premios, revisa datos bancarios y confirma pagos realizados.</p>
            </Link>

            {/* Módulos SUPERADMIN/MASTER */}
            {(isSuper || isMaster) && (
              <>
                <Link href="/admin/usuarios" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Datos de Usuarios</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Consulta información de usuarios registrados, datos bancarios y datos de contacto.</p>
                </Link>

                <Link href="/admin/historial" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Historial de Dinámicas</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Consulta el historial completo de sorteos ejecutados con filtros por fecha y tipo.</p>
                </Link>

                <Link href="/admin/referidos" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Referidos</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Genera links de referidos para atraer clientes y rastrea ingresos por cada link generado.</p>
                </Link>


                <Link href="/admin/templates" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Plantillas de Sorteos</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Crea y gestiona plantillas para crear sorteos más rápido y eficientemente.</p>
                </Link>


                <Link href="/admin/pagina-principal" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Página Principal</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Configura el carrusel de imágenes y videos de la portada principal con opciones gráficas avanzadas.</p>
                </Link>
              </>
            )}

            {/* Módulos solo MASTER */}
            {isMaster && (
              <>
                <Link href="/admin/terminos" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Términos y Condiciones</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Edita el contenido de términos y condiciones que se muestra a los usuarios.</p>
                </Link>

                <Link href="/admin/reglas" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Reglas</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Gestiona las reglas de los sorteos que se muestran en la interfaz de usuarios.</p>
                </Link>

                <Link href="/admin/pago-movil" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Pago Móvil</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Configura la imagen y datos (Cédula, Teléfono, Destino) de pago móvil para mostrar a los usuarios.</p>
                </Link>

                <Link href="/admin/redes-sociales" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Redes Sociales</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Gestiona los enlaces de redes sociales que se muestran en el pie de página.</p>
                </Link>
              </>
            )}

            {/* Módulos CONTABLE */}
            {isContable && (
              <Link href="/admin/estadisticas" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Estadísticas</h3>
                <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Visualiza estadísticas de ingresos, referencias y usuarios con gráficos interactivos.</p>
              </Link>
            )}

            {/* Módulos MASTER */}
            {isMaster && (
              <>
                <Link href="/admin/logs-admins" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Logs de Administradores</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Consulta el registro global de todas las acciones realizadas por administradores de todos los roles.</p>
                </Link>

                <Link href="/admin/roles/admins" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Gestionar Administradores</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Crea, modifica roles/permisos o elimina usuarios administradores de todos los roles (AGENT, SUPERADMIN, CONTABLE).</p>
                </Link>

                <Link href="/admin/estadisticas" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
                  <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Estadísticas</h3>
                  <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Visualiza estadísticas de ingresos, referencias y usuarios con gráficos interactivos.</p>
                </Link>
              </>
            )}

            {/* Módulos para todos los administradores */}
            <Link href="/admin/2fa" className="card" style={{ padding: "2rem", textDecoration: "none", display: "flex", flexDirection: "column", gap: "1rem", transition: "transform 0.2s", cursor: "pointer" }} onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-4px)"} onMouseLeave={(e) => e.currentTarget.style.transform = "translateY(0)"}>
              <h3 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--text-primary)" }}>Autenticación de Dos Factores (2FA)</h3>
              <p style={{ margin: 0, color: "var(--text-primary)", fontSize: "1rem", lineHeight: "1.5", opacity: 0.8 }}>Configura autenticación de dos factores para mayor seguridad en tu cuenta.</p>
            </Link>
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
