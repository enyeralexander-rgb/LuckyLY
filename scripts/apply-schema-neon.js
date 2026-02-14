#!/usr/bin/env node
/**
 * Verifica conexión a Neon y recuerda aplicar el schema.
 * El schema completo está en scripts/schema-neon.sql.
 * Para aplicarlo: Neon Console → SQL Editor → pegar contenido de schema-neon.sql y ejecutar.
 * Uso: node scripts/apply-schema-neon.js
 */
import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
dotenv.config({ path: join(root, ".env") });
dotenv.config({ path: join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL no definida. Configura .env.local con la URL de Neon.");
  process.exit(1);
}

async function main() {
  const sql = neon(url);
  try {
    await sql`SELECT 1`;
    console.log("✅ Conexión a Neon OK.");
    console.log("📋 Para crear tablas: Neon Console → SQL Editor → pegar y ejecutar scripts/schema-neon.sql");
  } catch (err) {
    console.error("❌ Error de conexión:", err.message);
    process.exit(1);
  }
}

main();
