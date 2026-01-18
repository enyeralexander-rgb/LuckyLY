/**
 * Rate Limiter simple en memoria usando Map
 * Limpia automáticamente entradas antiguas para evitar memory leaks
 */

interface RateLimitEntry {
  timestamps: number[];
  lastCleanup: number;
}

// Map para almacenar las solicitudes por IP
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuración
const MAX_REQUESTS = 10; // Máximo de solicitudes
const WINDOW_MS = 60 * 1000; // Ventana de tiempo: 1 minuto
const CLEANUP_INTERVAL = 5 * 60 * 1000; // Limpiar cada 5 minutos

/**
 * Limpia entradas antiguas del store
 */
function cleanupOldEntries() {
  const now = Date.now();
  for (const [ip, entry] of rateLimitStore.entries()) {
    // Filtrar timestamps fuera de la ventana de tiempo
    entry.timestamps = entry.timestamps.filter(
      (timestamp) => now - timestamp < WINDOW_MS
    );

    // Si no quedan timestamps, eliminar la entrada
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(ip);
    } else {
      entry.lastCleanup = now;
    }
  }
}

/**
 * Limpia el store periódicamente
 */
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanupTimer() {
  if (cleanupTimer) return; // Ya está corriendo
  
  cleanupTimer = setInterval(() => {
    cleanupOldEntries();
  }, CLEANUP_INTERVAL);
}

// Iniciar el timer de limpieza
if (typeof global !== 'undefined') {
  startCleanupTimer();
}

/**
 * Obtiene la IP del cliente desde los headers de la request
 * Considera proxies como Vercel (x-forwarded-for)
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  
  // En Vercel y otros proxies, la IP real está en x-forwarded-for
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for puede contener múltiples IPs separadas por coma
    // La primera es la IP original del cliente
    const firstIP = forwardedFor.split(",")[0].trim();
    if (firstIP) {
      return firstIP;
    }
  }

  // Fallback a x-real-ip
  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Último fallback: usar "unknown" (no debería pasar en producción)
  return "unknown";
}

/**
 * Verifica si una IP ha excedido el límite de solicitudes
 * @param ip - Dirección IP del cliente
 * @returns Objeto con `allowed` (boolean) y `remaining` (número de solicitudes restantes)
 */
export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  let entry = rateLimitStore.get(ip);

  // Si no existe entrada, crear una nueva
  if (!entry) {
    entry = {
      timestamps: [now],
      lastCleanup: now,
    };
    rateLimitStore.set(ip, entry);
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetAt: now + WINDOW_MS,
    };
  }

  // Limpiar timestamps fuera de la ventana de tiempo
  entry.timestamps = entry.timestamps.filter(
    (timestamp) => now - timestamp < WINDOW_MS
  );

  // Verificar si ha excedido el límite
  if (entry.timestamps.length >= MAX_REQUESTS) {
    // Calcular cuándo se reseteará (el timestamp más antiguo + ventana)
    const oldestTimestamp = Math.min(...entry.timestamps);
    const resetAt = oldestTimestamp + WINDOW_MS;

    return {
      allowed: false,
      remaining: 0,
      resetAt,
    };
  }

  // Agregar el nuevo timestamp
  entry.timestamps.push(now);
  entry.lastCleanup = now;
  rateLimitStore.set(ip, entry);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.timestamps.length,
    resetAt: now + WINDOW_MS,
  };
}

/**
 * Limpia todas las entradas del rate limiter (útil para tests)
 */
export function clearRateLimit(): void {
  rateLimitStore.clear();
}
