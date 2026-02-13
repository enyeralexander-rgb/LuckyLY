// Sistema de logging centralizado para servidor (APIs, lib).
// En producción no se deben incluir en context: contraseñas, tokens, PII completo.

type LogLevel = "error" | "warn" | "info" | "debug";

const SENSITIVE_KEYS = ["password", "passwordHash", "token", "secret", "authorization", "cookie", "auth_token"];

function sanitizeContext(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context || process.env.NODE_ENV !== "production") return context;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(context)) {
    const keyLower = k.toLowerCase();
    if (SENSITIVE_KEYS.some((s) => keyLower.includes(s))) {
      out[k] = "[REDACTED]";
    } else {
      out[k] = v;
    }
  }
  return out;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, unknown>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: sanitizeContext(context),
    };
  }

  private writeLog(entry: LogEntry) {
    const logString = JSON.stringify(entry);
    
    // En desarrollo: console
    if (process.env.NODE_ENV === "development") {
      const colors: Record<LogLevel, string> = {
        error: "\x1b[31m", // Rojo
        warn: "\x1b[33m",  // Amarillo
        info: "\x1b[36m",  // Cyan
        debug: "\x1b[90m", // Gris
      };
      const reset = "\x1b[0m";
      console.log(`${colors[entry.level]}${logString}${reset}`);
    } else {
      // En producción: escribir a archivo o servicio de logs
      console.log(logString);
      // Aquí se puede integrar con servicios como:
      // - Winston para archivos
      // - CloudWatch (AWS)
      // - Datadog
      // - ELK Stack
    }
  }

  error(message: string, context?: Record<string, unknown>) {
    this.writeLog(this.formatLog("error", message, context));
  }

  warn(message: string, context?: Record<string, unknown>) {
    this.writeLog(this.formatLog("warn", message, context));
  }

  info(message: string, context?: Record<string, unknown>) {
    this.writeLog(this.formatLog("info", message, context));
  }

  debug(message: string, context?: Record<string, unknown>) {
    if (process.env.NODE_ENV === "development") {
      this.writeLog(this.formatLog("debug", message, context));
    }
  }

  /** Log de APIs: incluye path, ip y userAgent sin datos sensibles del body. */
  apiLog(level: LogLevel, message: string, request: Request, context?: Record<string, unknown>) {
    const ip = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
    const userAgent = request.headers.get("user-agent") || "unknown";
    
    const entry = this.formatLog(level, message, {
      ...context,
      ip,
      userAgent,
      path: new URL(request.url).pathname,
    });

    this.writeLog(entry);
  }
}

export const logger = new Logger();
