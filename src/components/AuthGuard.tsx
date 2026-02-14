"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getStoredAuth, setStoredAuth, clearStoredAuth } from "../lib/clientAuth";
import { initSessionTimeout } from "../lib/sessionTimeout";

type AuthGuardProps = {
  children: React.ReactNode;
  requiredRole?: string[];
  redirectTo?: string;
};

const LOADING_MARKUP = (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      minHeight: "100vh",
      color: "#94a3b8",
    }}
  >
    Verificando autenticación...
  </div>
);

export function AuthGuard({ children, requiredRole, redirectTo = "/auth/login" }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
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
          credentials: "same-origin",
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
          // Sincronizar localStorage con datos del servidor (id, role) para que hijos tengan rol correcto
          try {
            const current = getStoredAuth();
            if (current?.token && data.user) {
              setStoredAuth({
                token: current.token,
                user: {
                  ...current.user,
                  id: data.user.id ?? current.user.id,
                  role: data.user.role ?? current.user.role,
                },
              });
            }
          } catch (_) {}
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
  }, [mounted, router, pathname, requiredRole, redirectTo]);

  // Mismo markup en servidor y primer paint en cliente para evitar hydration mismatch
  if (!mounted || isAuthorized === null) {
    return LOADING_MARKUP;
  }

  if (!isAuthorized) {
    return null;
  }

  return <>{children}</>;
}

