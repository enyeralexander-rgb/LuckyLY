#!/usr/bin/env node
/**
 * Aplica el schema local (scripts/schema-neon.sql) a la base de datos Neon.
 * Uso: npm run db:push  o  node scripts/db-push-neon.js
 * Requiere DATABASE_URL en .env.local.
 */
import path from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";
import dotenv from "dotenv";
import pg from "pg";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("❌ DATABASE_URL no definida. Configura .env.local con la URL de Neon.");
  process.exit(1);
}

async function main() {
  const client = new pg.Client({ connectionString: url });
  try {
    await client.connect();
    console.log("✅ Conexión a Neon OK.");
    const schemaPath = path.join(root, "schema", "00-initial.sql");
    const sql = readFileSync(schemaPath, "utf8");
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("--"));
    let ok = 0;
    let skip = 0;
    for (const stmt of statements) {
      const fullStmt = stmt.endsWith(";") ? stmt : stmt + ";";
      try {
        await client.query(fullStmt);
        ok++;
      } catch (err) {
        if (err.code === "42P07" || err.code === "42710" || err.message?.includes("already exists")) {
          skip++;
        } else {
          console.error("❌ Error ejecutando statement:", err.message);
          console.error("Statement (primeros 120 chars):", fullStmt.slice(0, 120) + "...");
          throw err;
        }
      }
    }
    console.log(`✅ Schema aplicado: ${ok} sentencias ejecutadas, ${skip} omitidas (ya existían).`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
