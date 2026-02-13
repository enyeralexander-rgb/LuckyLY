import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const { Pool } = pg;

// Prisma 7 con adapter para seeds
let databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida");
}

const cleanDatabaseUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    const obsoleteParams = ["sslmode", "sslcert", "sslkey", "sslrootcert"];
    obsoleteParams.forEach((param) => {
      if (urlObj.searchParams.has(param)) {
        urlObj.searchParams.delete(param);
      }
    });
    return urlObj.toString();
  } catch {
    return url;
  }
};

databaseUrl = cleanDatabaseUrl(databaseUrl);

const isPrismaPostgres = databaseUrl.includes("db.prisma.io");
const isNeon = databaseUrl.includes("neon.tech");
const requiresSSL = isPrismaPostgres || isNeon || process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: requiresSSL ? { rejectUnauthorized: false } : false,
  max: 5,
  min: 1,
  idleTimeoutMillis: 60000,
  connectionTimeoutMillis: 30000,
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

/**
 * Seed "solo limpieza": borra todos los datos de negocio y usuarios.
 * No crea ningún usuario. El primer MASTER se crea por:
 * - scripts/apply-schema-postgres.js (si MASTER_INITIAL_EMAIL y MASTER_INITIAL_PASSWORD están definidos)
 * - POST/GET /api/setup/create-master (body/query o env)
 * - scripts/create-master-vercel.ts (env)
 */
async function main() {
  console.log("🧹 Limpieza de base de datos (desde cero)...\n");

  // Orden: tablas que dependen de otras primero; User al final
  await prisma.passwordResetToken.deleteMany({});
  console.log("  ✓ PasswordResetToken");

  await prisma.emailVerificationToken.deleteMany({});
  console.log("  ✓ EmailVerificationToken");

  await prisma.twoFactorAuth.deleteMany({});
  console.log("  ✓ TwoFactorAuth");

  await prisma.notification.deleteMany({});
  console.log("  ✓ Notification");

  await prisma.favoriteRaffle.deleteMany({});
  console.log("  ✓ FavoriteRaffle");

  await prisma.referralVisit.deleteMany({});
  console.log("  ✓ ReferralVisit");

  await prisma.referralLink.deleteMany({});
  console.log("  ✓ ReferralLink");

  await prisma.prizeClaim.deleteMany({});
  console.log("  ✓ PrizeClaim");

  await prisma.ticketItem.deleteMany({});
  console.log("  ✓ TicketItem");

  await prisma.ticket.deleteMany({});
  console.log("  ✓ Ticket");

  await prisma.raffle.deleteMany({});
  console.log("  ✓ Raffle");

  await prisma.raffleTemplate.deleteMany({});
  console.log("  ✓ RaffleTemplate");

  await prisma.automationRule.deleteMany({});
  console.log("  ✓ AutomationRule");

  await prisma.auditLog.deleteMany({});
  console.log("  ✓ AuditLog");

  // Desvincular updatedById para poder borrar User
  await prisma.termsAndConditions.updateMany({ data: { updatedById: null } });
  await prisma.rules.updateMany({ data: { updatedById: null } });
  await prisma.paymentMobile.updateMany({ data: { updatedById: null } });
  await prisma.socialMedia.updateMany({ data: { updatedById: null } });
  await prisma.liveConfig.updateMany({ data: { updatedById: null } });
  await prisma.homePageConfig.updateMany({ data: { updatedById: null } });
  console.log("  ✓ Referencias updatedById anuladas");

  await prisma.user.updateMany({ data: { createdById: null } });
  await prisma.user.deleteMany({});
  console.log("  ✓ User");

  console.log("\n✅ Limpieza completada. Base de datos vacía (sin usuarios ni datos de negocio).");
  console.log("   Para crear el primer MASTER usa variables de entorno o /api/setup/create-master.\n");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
