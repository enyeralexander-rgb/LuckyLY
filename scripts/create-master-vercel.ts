#!/usr/bin/env tsx

/**
 * Script para crear/actualizar el usuario MASTER en la base de datos de Vercel
 * Ejecutar: npx tsx scripts/create-master-vercel.ts
 */

import { PrismaClient, Role } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL no está definida en las variables de entorno");
}

const pool = new Pool({ connectionString: databaseUrl });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("👤 Verificando/creando administrador MASTER...\n");

  const email = "enyeralexander@gmail.com";
  const password = "0995697717";
  const documentId = "V-0995697717";

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
          documentId: existingMaster.documentId || documentId
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
          documentId
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
  });
