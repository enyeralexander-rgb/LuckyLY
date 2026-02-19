import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    error: "Endpoint no encontrado",
    message: "Esta es la raíz de la API. Los endpoints disponibles incluyen:",
    endpoints: {
      auth: {
        login: "POST /api/auth/login",
        register: "POST /api/auth/register",
        logout: "POST /api/auth/logout",
        "check-availability": "GET /api/auth/check-availability",
        "forgot-password": "POST /api/auth/forgot-password",
        "reset-password": "POST /api/auth/reset-password",
        "2fa": {
          setup: "POST /api/auth/2fa/setup",
          verify: "POST /api/auth/2fa/verify",
          status: "GET /api/auth/2fa/status",
          disable: "POST /api/auth/2fa/disable"
        }
      },
      raffles: {
        list: "GET /api/raffles",
        create: "POST /api/raffles",
        buy: "POST /api/raffles/[id]/buy",
        execute: "POST /api/raffles/[id]/execute"
      },
      user: {
        profile: "GET /api/user/profile",
        payments: "GET /api/user/payments",
        avatar: "POST /api/user/avatar"
      },
      public: {
        homepage: "GET /api/public/homepage",
        terms: "GET /api/public/terms",
        social: "GET /api/public/social"
      },
      admin: {
        dashboard: "GET /api/admin/dashboard",
        users: "GET /api/admin/users",
        raffles: "GET /api/admin/raffles",
        payments: "GET /api/admin/payments",
        statistics: "GET /api/admin/estadisticas"
      },
      health: "GET /api/health"
    },
    version: "1.0.0",
    status: 404
  }, { status: 404 });
}

export async function POST() {
  return NextResponse.json({
    error: "Método no permitido",
    message: "Solo se permiten peticiones GET a la raíz de la API",
    allowedMethods: ["GET"],
    status: 405
  }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({
    error: "Método no permitido",
    message: "Solo se permiten peticiones GET a la raíz de la API",
    allowedMethods: ["GET"],
    status: 405
  }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({
    error: "Método no permitido",
    message: "Solo se permiten peticiones GET a la raíz de la API",
    allowedMethods: ["GET"],
    status: 405
  }, { status: 405 });
}