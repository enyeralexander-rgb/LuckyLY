"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, clearStoredAuth } from "../lib/clientAuth";
import { initSessionTimeout } from "../lib/sessionTimeout";

type AuthGuardProps = {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
};

export function AuthGuard({ children, requiredRole, redirectTo = "/auth/login" }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const auth = getStoredAuth();
      
      if (!auth) {
        // No hay autenticación, redirigir al login
        router.replace(redirectTo);
        return;
      }

      // Verificar token en el servidor también
      try {
        const res = await fetch("/api/auth/verify", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${auth.token}`
          },
          cache: "no-store"
        });

        if (!res.ok) {
          // Token inválido o expirado, limpiar y redirigir
          clearStoredAuth();
          router.replace(redirectTo);
          return;
        }

        const data = await res.json();
        if (data && data.valid) {
          // Verificar rol si es necesario
          if (requiredRole && !requiredRole.includes(data.user.role)) {
            // Si es administrador intentando acceder a página de admin sin permisos, redirigir a /admin
            const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(data.user.role);
            if (isAdmin) {
              router.replace("/admin");
            } else {
              router.replace("/");
            }
            return;
          }

          // Protección adicional: Verificar que no haya cruce de roles
          const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(data.user.role);
          const isUserRoute = pathname.startsWith("/cuenta") || pathname.startsWith("/dashboard") || pathname.startsWith("/payment") || pathname.startsWith("/raffles/");
          const isAdminRoute = pathname.startsWith("/admin");

          // Si es admin intentando acceder a rutas de usuario
          if (isAdmin && isUserRoute && !pathname.startsWith("/admin")) {
            router.replace("/admin");
            return;
          }

          // Si es usuario normal intentando acceder a rutas de admin
          if (!isAdmin && isAdminRoute) {
            router.replace("/");
            return;
          }

          setIsAuthorized(true);
          // Inicializar timeout de sesión
          initSessionTimeout();
        } else {
          router.replace(redirectTo);
        }
      } catch (error) {
        console.error("Error verificando autenticación:", error);
        router.replace(redirectTo);
      }
    };

    checkAuth();
  }, [router, pathname, requiredRole, redirectTo]);

  // Mostrar loading mientras se verifica
  if (isAuthorized === null) {
    return (
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        minHeight: "100vh",
        color: "#94a3b8"
      }}>
        Verificando autenticación...
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

