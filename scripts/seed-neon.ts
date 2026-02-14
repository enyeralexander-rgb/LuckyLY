#!/usr/bin/env node
/**
 * Seed Neon: limpieza de datos usando la capa db (SQL vía Neon).
 * No usa Prisma. Ejecutar: npx tsx scripts/seed-neon.ts
 * Requiere DATABASE_URL en .env o .env.local.
 *
 * Solo borra datos de negocio y usuarios. Para crear el primer MASTER:
 * - POST /api/setup/create-master (body o MASTER_INITIAL_EMAIL / MASTER_INITIAL_PASSWORD)
 * - npx tsx scripts/create-master-vercel.ts
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no está definida. Configura .env o .env.local.");
  }

  const { getSql } = await import("../src/lib/db/neon.js");
  const sql = getSql();

  console.log("🧹 Limpieza de base de datos (Neon, capa db)...\n");

  // Orden respetando FK: hijos antes que padres (ReferralVisit antes ReferralLink; PrizeClaim/TicketItem antes Ticket; _TemplateRaffles antes Raffle/RaffleTemplate).
  await sql`DELETE FROM "PasswordResetToken"`;
  console.log("  ✓ PasswordResetToken");
  await sql`DELETE FROM "EmailVerificationToken"`;
  console.log("  ✓ EmailVerificationToken");
  await sql`DELETE FROM "TwoFactorAuth"`;
  console.log("  ✓ TwoFactorAuth");
  await sql`DELETE FROM "Notification"`;
  console.log("  ✓ Notification");
  await sql`DELETE FROM "FavoriteRaffle"`;
  console.log("  ✓ FavoriteRaffle");
  await sql`DELETE FROM "ReferralVisit"`;
  console.log("  ✓ ReferralVisit");
  await sql`DELETE FROM "ReferralLink"`;
  console.log("  ✓ ReferralLink");
  await sql`DELETE FROM "PrizeClaim"`;
  console.log("  ✓ PrizeClaim");
  await sql`DELETE FROM "TicketItem"`;
  console.log("  ✓ TicketItem");
  await sql`DELETE FROM "Ticket"`;
  console.log("  ✓ Ticket");
  await sql`DELETE FROM "_TemplateRaffles"`;
  console.log("  ✓ _TemplateRaffles");
  await sql`DELETE FROM "Raffle"`;
  console.log("  ✓ Raffle");
  await sql`DELETE FROM "RaffleTemplate"`;
  console.log("  ✓ RaffleTemplate");
  await sql`DELETE FROM "AutomationRule"`;
  console.log("  ✓ AutomationRule");
  await sql`DELETE FROM "AuditLog"`;
  console.log("  ✓ AuditLog");

  await sql`UPDATE "TermsAndConditions" SET "updatedById" = NULL`;
  await sql`UPDATE "Rules" SET "updatedById" = NULL`;
  await sql`UPDATE "PaymentMobile" SET "updatedById" = NULL`;
  await sql`UPDATE "SocialMedia" SET "updatedById" = NULL`;
  await sql`UPDATE "LiveConfig" SET "updatedById" = NULL`;
  await sql`UPDATE "HomePageConfig" SET "updatedById" = NULL`;
  console.log("  ✓ Referencias updatedById anuladas");

  await sql`UPDATE "User" SET "createdById" = NULL`;
  await sql`DELETE FROM "User"`;
  console.log("  ✓ User");

  console.log("\n✅ Limpieza completada. Base de datos vacía.");
  console.log("   Para crear el primer MASTER: variables de entorno + npx tsx scripts/create-master-vercel.ts o POST /api/setup/create-master.\n");
}

main().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
