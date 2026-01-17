import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Prisma 7 con adapter para seeds
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida");
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

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: true } : false,
  // Configuración robusta para evitar errores P1017 (ConnectionClosed)
  max: 20,
  min: 2,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 20000,
  allowExitOnIdle: true,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
  adapter,
  transactionOptions: {
    maxWait: 20000,
    timeout: 10000,
  },
});

async function main() {
  console.log("🧹 Limpiando datos de prueba...\n");

  // NOTA: El usuario MASTER ya se crea en el script apply-schema-postgres.js
  // Este seed solo maneja datos adicionales de prueba

  // Eliminar todas las notificaciones
  await prisma.notification.deleteMany({});
  console.log("  ✓ Notificaciones eliminadas");

  // Eliminar todos los ticketItems
  await prisma.ticketItem.deleteMany({});
  console.log("  ✓ TicketItems eliminados");

  // Eliminar todos los prizeClaims
  await prisma.prizeClaim.deleteMany({});
  console.log("  ✓ PrizeClaims eliminados");

  // Eliminar todos los tickets
  await prisma.ticket.deleteMany({});
  console.log("  ✓ Tickets eliminados");

  // Eliminar todos los sorteos
  await prisma.raffle.deleteMany({});
  console.log("  ✓ Ruletas eliminadas");

  // Eliminar todos los auditLogs
  await prisma.auditLog.deleteMany({});
  console.log("  ✓ AuditLogs eliminados");

  // Eliminar TODOS los usuarios (sin excepciones)
  await prisma.user.deleteMany({});
  console.log("  ✓ Todos los usuarios eliminados");

  console.log("\n✅ Limpieza completada. Base de datos limpia.\n");

  console.log("👥 Creando usuarios de prueba...\n");

  // Crear 5 usuarios de prueba de cada tipo
  const testUsers = [
    // 5 usuarios USER (clientes)
    { email: "cliente1@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Uno", username: "cliente1", documentId: "V-12345678" },
    { email: "cliente2@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Dos", username: "cliente2", documentId: "V-12345679" },
    { email: "cliente3@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Tres", username: "cliente3", documentId: "V-12345680" },
    { email: "cliente4@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Cuatro", username: "cliente4", documentId: "V-12345681" },
    { email: "cliente5@test.com", password: "Cliente123!", role: Role.USER, name: "Cliente Cinco", username: "cliente5", documentId: "V-12345682" },
    
    // 5 usuarios AGENT
    { email: "agent1@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Uno", username: "agent1", documentId: "V-22345678" },
    { email: "agent2@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Dos", username: "agent2", documentId: "V-22345679" },
    { email: "agent3@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Tres", username: "agent3", documentId: "V-22345680" },
    { email: "agent4@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Cuatro", username: "agent4", documentId: "V-22345681" },
    { email: "agent5@test.com", password: "Agent123!", role: Role.AGENT, name: "Agente Cinco", username: "agent5", documentId: "V-22345682" },
    
    // 5 usuarios SUPERADMIN
    { email: "superadmin1@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Uno", username: "superadmin1", documentId: "V-32345678" },
    { email: "superadmin2@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Dos", username: "superadmin2", documentId: "V-32345679" },
    { email: "superadmin3@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Tres", username: "superadmin3", documentId: "V-32345680" },
    { email: "superadmin4@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Cuatro", username: "superadmin4", documentId: "V-32345681" },
    { email: "superadmin5@test.com", password: "Super123!", role: Role.SUPERADMIN, name: "Superadmin Cinco", username: "superadmin5", documentId: "V-32345682" },
    
    // 5 usuarios MASTER
    { email: "master1@test.com", password: "Master123!", role: Role.MASTER, name: "Master Uno", username: "master1", documentId: "V-42345678" },
    { email: "master2@test.com", password: "Master123!", role: Role.MASTER, name: "Master Dos", username: "master2", documentId: "V-42345679" },
    { email: "master3@test.com", password: "Master123!", role: Role.MASTER, name: "Master Tres", username: "master3", documentId: "V-42345680" },
    { email: "master4@test.com", password: "Master123!", role: Role.MASTER, name: "Master Cuatro", username: "master4", documentId: "V-42345681" },
    { email: "master5@test.com", password: "Master123!", role: Role.MASTER, name: "Master Cinco", username: "master5", documentId: "V-42345682" }
  ];

  for (const u of testUsers) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.create({
      data: {
        email: u.email,
        passwordHash,
        name: u.name,
        username: u.username,
        documentId: u.documentId,
        role: u.role
      }
    });
    console.log(`  ✅ ${u.role} creado: ${u.email} (username: ${u.username})`);
  }

  console.log("\n✅ Seed completado:");
  console.log("  • 5 usuarios USER (clientes)");
  console.log("  • 5 usuarios AGENT");
  console.log("  • 5 usuarios SUPERADMIN");
  console.log("  • 5 usuarios MASTER");
  console.log("  • Total: 20 usuarios de prueba");
  console.log("  • Base de datos limpia: sin ruletas, sin historiales");
  console.log("\n📝 Credenciales de acceso:");
  console.log("  • Clientes: cliente1@test.com - cliente5@test.com (password: Cliente123!)");
  console.log("  • Agentes: agent1@test.com - agent5@test.com (password: Agent123!)");
  console.log("  • Superadmins: superadmin1@test.com - superadmin5@test.com (password: Super123!)");
  console.log("  • Masters: master1@test.com - master5@test.com (password: Master123!)");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
