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

// Crear pool de conexiones y adapter
// Configuración SSL moderna para evitar warnings de pg-connection-string
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false
});
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" 
      ? ["warn", "error"] 
      : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

