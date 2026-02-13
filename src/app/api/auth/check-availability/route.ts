import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
import { prisma } from "../../../../lib/prisma";
import { getClientIP, checkRateLimit } from "../../../../lib/rateLimit";
import { logger } from "../../../../lib/logger";

export async function GET(request: Request) {
  try {
    // Rate limiting: verificar límite de solicitudes por IP
    const clientIP = getClientIP(request);
    const rateLimitResult = checkRateLimit(clientIP);

    if (!rateLimitResult.allowed) {
      const retryAfter = Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000);
      return NextResponse.json(
        { 
          error: "Demasiados intentos. Por favor espera un momento.",
          retryAfter 
        },
        { 
          status: 429,
          headers: {
            "Retry-After": retryAfter.toString(),
            "X-RateLimit-Limit": "10",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": new Date(rateLimitResult.resetAt).toISOString(),
          }
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const field = searchParams.get("field");
    const value = searchParams.get("value");

    if (!field || !value) {
      return NextResponse.json({ error: "Campo y valor son requeridos" }, { status: 400 });
    }

    // Validar que el campo sea uno de los permitidos
    const allowedFields = ["email", "username", "documentId"];
    if (!allowedFields.includes(field)) {
      return NextResponse.json({ error: "Campo no permitido" }, { status: 400 });
    }

    let exists = false;
    const cleanValue = value.trim();

    switch (field) {
      case "email":
        exists = !!(await prisma.user.findUnique({ where: { email: cleanValue } }));
        break;
      case "username":
        const cleanUsername = cleanValue.toLowerCase();
        exists = !!(await prisma.user.findUnique({ where: { username: cleanUsername } }));
        break;
      case "documentId":
        exists = !!(await prisma.user.findUnique({ where: { documentId: cleanValue } }));
        break;
    }

    return NextResponse.json(
      { 
        available: !exists,
        exists 
      },
      {
        headers: {
          "X-RateLimit-Limit": "10",
          "X-RateLimit-Remaining": rateLimitResult.remaining.toString(),
          "X-RateLimit-Reset": new Date(rateLimitResult.resetAt).toISOString(),
        }
      }
    );
  } catch (err) {
    logger.error("Error al verificar disponibilidad", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Error al verificar disponibilidad" }, { status: 500 });
  }
}
