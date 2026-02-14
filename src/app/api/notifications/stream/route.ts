import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "../../../../lib/auth";
import type { Role } from "../../../../lib/db-types";

const ALLOWED_ROLES: Role[] = ["USER", "AGENT", "CONTABLE", "SUPERADMIN", "MASTER"];

// Server-Sent Events para notificaciones en tiempo real
export async function GET(request: Request) {
  try {
    requireAuth(request, ALLOWED_ROLES);
    
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Enviar mensaje inicial
        const send = (data: any) => {
          const message = `data: ${JSON.stringify(data)}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        send({ type: "connected", message: "Conectado a notificaciones en tiempo real" });

        // Simular notificaciones (en producción, esto vendría de eventos reales)
        const interval = setInterval(() => {
          // Este intervalo se puede reemplazar con eventos reales
          // Por ejemplo, cuando se crea una notificación en la BD
        }, 30000); // Cada 30 segundos

        // Limpiar cuando se cierre la conexión
        request.signal.addEventListener("abort", () => {
          clearInterval(interval);
          controller.close();
        });
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ error: "Error al establecer conexión" }, { status: 500 });
  }
}
