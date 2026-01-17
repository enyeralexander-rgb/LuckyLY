// Prisma 7 con Prisma Postgres
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined 
};

// Prisma Postgres con protocolo postgres:// requiere adapter
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
}

// Limpiar parámetros SSL obsoletos que causan warnings en pg-connection-string
// Remover sslmode=require, sslmode=prefer, sslmode=verify-ca que son tratados como aliases
const cleanDatabaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    // Remover parámetros SSL obsoletos
    const obsoleteParams = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];
    obsoleteParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
      }
    });
    return urlObj.toString();
  } catch (error) {
    // Si no es una URL válida, devolver como está
    return url;
  }
};

databaseUrl = cleanDatabaseUrl(databaseUrl);

// Crear pool de conexiones y adapter con configuración robusta
// Configuración SSL moderna para evitar warnings de pg-connection-string
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  // Configuración robusta para evitar errores P1017 (ConnectionClosed)
  max: 20, // Máximo de conexiones en el pool
  min: 2,  // Mínimo de conexiones en el pool
  idleTimeoutMillis: 30000, // Cerrar conexiones idle después de 30 segundos
  connectionTimeoutMillis: 20000, // Timeout de conexión de 20 segundos
  allowExitOnIdle: true, // Permitir salir cuando esté idle
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development"
      ? ["warn", "error"]
      : ["error"],
    // Configuración robusta para manejar reconexiones
    transactionOptions: {
      maxWait: 20000, // Máximo tiempo de espera para transacción
      timeout: 10000, // Timeout de transacción
    },
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

