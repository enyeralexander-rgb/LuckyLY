import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const ADMIN_ROUTES = ["/admin"];
const USER_PROTECTED_ROUTES = ["/dashboard", "/perfil", "/payment"];
const AUTH_ROUTES = ["/auth/login", "/auth/register"];

// Rutas específicas que requieren roles específicos
const SUPERADMIN_MASTER_ROUTES = [
  "/admin/usuarios",
  "/admin/historial",
  "/admin/referidos"
];

const MASTER_ONLY_ROUTES = [
  "/admin/logs-super",
  "/admin/logs-admins",
  "/admin/roles/superadmins",
  "/admin/roles/admins",
  "/admin/roles/admins/[id]/modificar",
  "/admin/terminos",
  "/admin/reglas",
  "/admin/pago-movil",
  "/admin/redes-sociales",
  "/admin/estadisticas/user"
];

const CONTABLE_MASTER_ROUTES = [
  "/admin/estadisticas"
];

const SUPERADMIN_MASTER_ROUTES_EXTENDED = [
  ...SUPERADMIN_MASTER_ROUTES
];

const AGENT_SUPERADMIN_MASTER_ROUTES = [
  "/admin/pagina-principal"
];

async function verifyToken(token: string, key: Uint8Array) {
  try {
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Rate limiting se implementará en las APIs individuales
  // (no se puede usar imports dinámicos en middleware de Next.js)

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    // Permitir pasar si no hay secret, pero loguear error (o redirigir a error page)
    // En producción esto debería ser fatal, pero para build puede ser necesario
    console.error("CRITICAL: JWT_SECRET is missing in middleware");
  }
  
  const token = req.cookies.get("auth_token")?.value;
  // Solo verificar si hay secret y token
  const payload = (token && secret) ? await verifyToken(token, new TextEncoder().encode(secret)) : null;

  // REGLA: Redirigir administradores desde la página principal (/) al dashboard
  if (pathname === "/" && payload?.role) {
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(String(payload.role));
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }
  }

  // Bloqueo de rutas de auth si ya hay sesión
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAuthRoute && payload?.role) {
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(String(payload.role));
    return NextResponse.redirect(new URL(isAdmin ? "/admin" : "/", req.url));
  }

  // Protección de rutas de administrador
  const isAdminRoute = ADMIN_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isAdminRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (!payload?.sub || !payload.role) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    const userRole = String(payload.role);
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(userRole);
    
    if (!isAdmin) {
      // Usuario normal intentando acceder a admin
      return NextResponse.redirect(new URL("/", req.url));
    }

    // Verificar rutas que requieren AGENT, SUPERADMIN o MASTER
    const requiresAgentSuperMaster = AGENT_SUPERADMIN_MASTER_ROUTES.some((route) => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    if (requiresAgentSuperMaster && !["AGENT", "SUPERADMIN", "MASTER"].includes(userRole)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Verificar rutas que requieren SUPERADMIN o MASTER
    const requiresSuperMaster = SUPERADMIN_MASTER_ROUTES_EXTENDED.some((route) => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    if (requiresSuperMaster && !["SUPERADMIN", "MASTER"].includes(userRole)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Verificar rutas que requieren CONTABLE o MASTER
    const requiresContableMaster = CONTABLE_MASTER_ROUTES.some((route) => 
      pathname === route || pathname.startsWith(`${route}/`)
    );
    if (requiresContableMaster && !["CONTABLE", "MASTER"].includes(userRole)) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    // Verificar rutas que requieren solo MASTER
    const requiresMaster = MASTER_ONLY_ROUTES.some((route) => {
      // Reemplazar [id] con patrón de coincidencia para rutas dinámicas
      const routePattern = route.replace(/\[id\]/g, "[^/]+");
      const regex = new RegExp(`^${routePattern.replace(/\//g, "\\/")}(/.*)?$`);
      return pathname === route || pathname.startsWith(`${route}/`) || regex.test(pathname);
    });
    if (requiresMaster && userRole !== "MASTER") {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  // Protección de rutas de usuario - SOLO usuarios normales (no admin)
  const isUserProtectedRoute = USER_PROTECTED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
  if (isUserProtectedRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (!payload?.sub || !payload.role) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Bloquear acceso a administradores - solo usuarios normales (USER)
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(String(payload.role));
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  // Protección de rutas de compra de cupos (/raffles/[id])
  if (pathname.startsWith("/raffles/") && pathname !== "/raffles") {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (!payload?.sub || !payload.role) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Bloquear acceso a administradores - solo usuarios normales (USER)
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(String(payload.role));
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  // Protección adicional: Rutas de cuenta solo para usuarios normales
  if (pathname.startsWith("/cuenta") || pathname.startsWith("/dashboard") || pathname === "/payment") {
    if (!token) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    if (!payload?.sub || !payload.role) {
      return NextResponse.redirect(new URL("/auth/login", req.url));
    }

    // Bloquear acceso a administradores
    const isAdmin = ["AGENT", "CONTABLE", "SUPERADMIN", "MASTER"].includes(String(payload.role));
    if (isAdmin) {
      return NextResponse.redirect(new URL("/admin", req.url));
    }

    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/perfil",
    "/perfil/:path*",
    "/payment",
    "/payment/:path*",
    "/raffles/:path*",
    "/cuenta/:path*",
    "/auth/login",
    "/auth/register"
  ]
};

