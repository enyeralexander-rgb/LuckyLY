#!/usr/bin/env tsx

/**
 * Script para crear/actualizar el usuario MASTER en la base de datos de Vercel
 * Ejecutar: npx tsx scripts/create-master-vercel.ts
 */

import "dotenv/config";
import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

// Verificar que DATABASE_URL esté disponible
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  console.log('\nEjecuta el script con:');
  console.log('DATABASE_URL="tu_url_aqui" npx tsx scripts/create-master-vercel.ts');
  process.exit(1);
}

// Prisma Postgres requiere adapter
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("👤 Verificando/creando administrador MASTER...\n");

  const email = "enyeralexander@gmail.com";
  const password = "0995697717";
  const documentId = "V-0995697717";
  const nationalId = "0995697717";
  const nationalIdType = "V";

  try {
    const existingMaster = await prisma.user.findUnique({
      where: { email }
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      // Actualizar el usuario existente
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          suspended: false,
          documentId: existingMaster.documentId || documentId,
          nationalId: existingMaster.nationalId || nationalId,
          nationalIdType: existingMaster.nationalIdType || nationalIdType
        }
      });
      console.log("✅ Administrador MASTER actualizado");
    } else {
      // Crear nuevo administrador MASTER
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: "Administrador Master",
          username: "master",
          role: Role.MASTER,
          emailVerified: true,
          emailVerifiedAt: new Date(),
          documentId,
          nationalId,
          nationalIdType
        }
      });
      console.log("✅ Administrador MASTER creado");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ USUARIO MASTER CONFIGURADO");
    console.log("=".repeat(60));
    console.log("📊 Credenciales:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error al crear/actualizar usuario MASTER:", error);
    throw error;
  }
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
