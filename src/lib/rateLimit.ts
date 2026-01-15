// Rate limiting simple en memoria (para producción usar Redis)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

interface RateLimitOptions {
  windowMs: number; // Ventana de tiempo en ms
  maxRequests: number; // Máximo de requests en la ventana
}

export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions = { windowMs: 60000, maxRequests: 100 }
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetTime) {
    // Nueva ventana o ventana expirada
    requestCounts.set(identifier, {
      count: 1,
      resetTime: now + options.windowMs,
    });
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (record.count >= options.maxRequests) {
    // Límite alcanzado
    return {
      allowed: false,
      remaining: 0,
      resetTime: record.resetTime,
    };
  }

  // Incrementar contador
  record.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - record.count,
    resetTime: record.resetTime,
  };
}

// Limpiar registros expirados periódicamente
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}, 60000); // Cada minuto

// Helper para obtener identificador de request
export function getRequestIdentifier(request: Request): string {
  // Intentar obtener IP del request
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] || realIp || "unknown";

  // Obtener pathname para rate limiting por ruta
  const url = new URL(request.url);
  const path = url.pathname;

  return `${ip}:${path}`;
}
