// Sistema de logging mejorado con niveles y estructuración

type LogLevel = "error" | "warn" | "info" | "debug";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, any>;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

class Logger {
  private formatLog(level: LogLevel, message: string, context?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
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

  error(message: string, context?: Record<string, any>) {
    this.writeLog(this.formatLog("error", message, context));
  }

  warn(message: string, context?: Record<string, any>) {
    this.writeLog(this.formatLog("warn", message, context));
  }

  info(message: string, context?: Record<string, any>) {
    this.writeLog(this.formatLog("info", message, context));
  }

  debug(message: string, context?: Record<string, any>) {
    if (process.env.NODE_ENV === "development") {
      this.writeLog(this.formatLog("debug", message, context));
    }
  }

  // Helper para logs de API
  apiLog(level: LogLevel, message: string, request: Request, context?: Record<string, any>) {
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
