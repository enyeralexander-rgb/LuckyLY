// Prisma 7: El cliente se genera en node_modules/.prisma/client
// pero se importa desde @prisma/client que apunta a esa ubicación
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Prisma 7: Requiere usar un adaptador específico de PostgreSQL
// La URL se lee de DATABASE_URL o de prisma.config.ts
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
}

// Normalizar la URL de conexión para evitar warnings de SSL
// Si la URL tiene sslmode pero no es verify-full, lo actualizamos
// Si no tiene sslmode, agregamos verify-full explícitamente
try {
  const url = new URL(databaseUrl);
  const params = url.searchParams;
  
  // Si tiene sslmode pero es uno de los modos que causan warning
  const sslMode = params.get("sslmode");
  if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
    params.set("sslmode", "verify-full");
    url.search = params.toString();
    databaseUrl = url.toString();
  } else if (!sslMode && url.protocol === "postgresql:") {
    // Si no tiene sslmode y es PostgreSQL, agregar verify-full
    params.set("sslmode", "verify-full");
    url.search = params.toString();
    databaseUrl = url.toString();
  }
} catch (e) {
  // Si falla el parsing, usar la URL original
  console.warn("No se pudo normalizar DATABASE_URL:", e);
}

// Crear el pool de conexiones de PostgreSQL
const pool = new Pool({ connectionString: databaseUrl });

// Crear el adaptador de Prisma para PostgreSQL
const adapter = new PrismaPg(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

