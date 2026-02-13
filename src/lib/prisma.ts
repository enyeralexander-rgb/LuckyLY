// Prisma 7 con Prisma Postgres
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool, PoolConfig } from "pg";

// Singleton pattern para evitar múltiples conexiones en desarrollo
const globalForPrisma = globalThis as unknown as { 
  prisma: PrismaClient | undefined;
  pool: Pool | undefined;
};

// Limpiar parámetros SSL obsoletos que causan warnings en pg-connection-string
const cleanDatabaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const obsoleteParams = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];
    obsoleteParams.forEach(param => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
};

// Función para crear el pool de conexiones
function createPool(): Pool {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error("DATABASE_URL no está definida en las variables de entorno");
  }

  const cleanedUrl = cleanDatabaseUrl(databaseUrl);
  const isProduction = process.env.NODE_ENV === 'production';
  
  // Detectar si es Prisma Postgres (db.prisma.io) o Neon (neon.tech) u otro
  const isPrismaPostgres = databaseUrl.includes('db.prisma.io');
  const isNeon = databaseUrl.includes('neon.tech');
  const requiresSSL = isPrismaPostgres || isNeon || isProduction;

  const poolConfig: PoolConfig = {
    connectionString: cleanedUrl,
    // SSL siempre habilitado para bases de datos cloud
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
    // Configuración robusta para evitar errores P1017 (ConnectionClosed)
    max: isProduction ? 20 : 5,
    min: 1,
    idleTimeoutMillis: 60000, // 60 segundos
    connectionTimeoutMillis: 30000, // 30 segundos
    allowExitOnIdle: true,
  };

  const pool = new Pool(poolConfig);

  // Manejar errores del pool para evitar crashes
  pool.on('error', (err) => {
    console.error('🔴 Error inesperado en pool de PostgreSQL:', err.message);
  });

  return pool;
}

// Función para crear PrismaClient
function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL;

  // Si usamos Prisma Accelerate (prisma+postgres://), no usar adapter-pg
  if (databaseUrl && databaseUrl.startsWith("prisma+")) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
    });
  }

  // Reutilizar o crear pool para conexiones estándar (Neon, RDS, etc)
  if (!globalForPrisma.pool) {
    globalForPrisma.pool = createPool();
  }

  const adapter = new PrismaPg(globalForPrisma.pool);

  const shouldLogPrisma =
    process.env.NODE_ENV === "development" || process.env.PRISMA_LOG === "true";

  return new PrismaClient({
    adapter,
    log: shouldLogPrisma ? ["warn", "error"] : [],
    transactionOptions: {
      maxWait: 30000,
      timeout: 20000,
    },
  });
}

// Obtener instancia singleton (inicialización perezosa para que el build no falle sin DATABASE_URL)
function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }
  const client = createPrismaClient();
  globalForPrisma.prisma = client;
  return client;
}

// Proxy que crea el cliente solo en el primer uso (evita error en "next build" sin .env)
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

