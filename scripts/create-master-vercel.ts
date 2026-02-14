#!/usr/bin/env tsx
/**
 * Crea o actualiza el usuario MASTER en Neon (capa db, sin Prisma).
 * Ejecutar: npx tsx scripts/create-master-vercel.ts
 * Requiere: DATABASE_URL, MASTER_INITIAL_EMAIL, MASTER_INITIAL_PASSWORD en .env o .env.local
 */
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
dotenv.config({ path: path.join(root, ".env"), quiet: true });
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL no está definida en las variables de entorno");
    console.log("\nEjecuta el script con .env.local o:");
    console.log('DATABASE_URL="tu_url" MASTER_INITIAL_EMAIL="admin@ejemplo.com" MASTER_INITIAL_PASSWORD="tu_password" npx tsx scripts/create-master-vercel.ts');
    process.exit(1);
  }

  const email = process.env.MASTER_INITIAL_EMAIL?.trim();
  const password = process.env.MASTER_INITIAL_PASSWORD;
  const name = process.env.MASTER_INITIAL_NAME?.trim() || "Administrador Master";
  const documentIdRaw = process.env.MASTER_INITIAL_DOCUMENT_ID?.trim();
  const documentId = documentIdRaw || `V-MASTER-${Date.now()}`;
  const nationalId = documentId.includes("-") ? documentId.split("-")[1]! : documentId;
  const nationalIdType = documentId.toUpperCase().startsWith("E-") ? "E" : "V";

  if (!email || !password) {
    console.error("❌ Faltan MASTER_INITIAL_EMAIL o MASTER_INITIAL_PASSWORD en el entorno.");
    console.log("\nEjemplo:");
    console.log('MASTER_INITIAL_EMAIL="admin@ejemplo.com" MASTER_INITIAL_PASSWORD="tu_password" npx tsx scripts/create-master-vercel.ts');
    process.exit(1);
  }

  const { users } = await import("../src/lib/db/index.js");
  const { newId } = await import("../src/lib/id.js");

  console.log("👤 Verificando/creando administrador MASTER (Neon, capa db)...\n");

  try {
    const existingMaster = await users.findByEmail(email);
    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      await users.update(existingMaster.id, {
        passwordHash,
        role: "MASTER",
        emailVerified: true,
        emailVerifiedAt: new Date(),
        suspended: false,
        documentId: existingMaster.documentId || documentId,
        name: name || existingMaster.name,
      });
      console.log("✅ Administrador MASTER actualizado");
    } else {
      await users.create({
        id: newId(),
        email,
        passwordHash,
        name,
        username: "master",
        role: "MASTER",
        documentId,
        emailVerified: true,
        emailVerifiedAt: new Date(),
      });
      console.log("✅ Administrador MASTER creado");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ USUARIO MASTER CONFIGURADO");
    console.log("=".repeat(60));
    console.log(`📧 Email: ${email}`);
    console.log("=".repeat(60));
  } catch (error) {
    console.error("❌ Error al crear/actualizar usuario MASTER:", error);
    process.exit(1);
  }
}

main();
