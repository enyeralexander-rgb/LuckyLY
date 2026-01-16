// Prisma 7: El cliente se genera en node_modules/.prisma/client
// pero se importa desde @prisma/client que apunta a esa ubicación
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

// Prisma 7: Requiere usar un adaptador específico de PostgreSQL
// La URL se lee de DATABASE_URL o de prisma.config.ts
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
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

