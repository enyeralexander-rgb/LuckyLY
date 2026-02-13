import { logger } from "./logger";

/**
 * Ejecuta una función async con reintentos automáticos para errores transitorios
 * de base de datos (P1017 ConnectionClosed, connection refused, upstream, etc.).
 *
 * Ideal para entornos serverless (Vercel) donde las conexiones pueden cerrarse
 * entre invocaciones.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: { retries?: number; delayMs?: number; label?: string }
): Promise<T> {
  const { retries = 2, delayMs = 500, label = "DB operation" } = options ?? {};

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const message = err?.message ?? String(err);
      const isTransient =
        /connect|upstream|ECONNREFUSED|ETIMEDOUT|P1017|ConnectionClosed|connection.*closed/i.test(message);

      if (!isTransient || attempt === retries) {
        throw err;
      }

      const wait = delayMs * Math.pow(2, attempt); // backoff exponencial
      logger.warn(`${label}: reintentando (${attempt + 1}/${retries}) en ${wait}ms`, {
        error: message
      });
      await new Promise((resolve) => setTimeout(resolve, wait));
    }
  }

  // Nunca debería llegar aquí, pero TypeScript lo requiere
  throw new Error(`${label}: reintentos agotados`);
}
