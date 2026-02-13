#!/usr/bin/env node
/**
 * Comprueba variables de entorno locales.
 * Carga .env.local o .env y reporta cuáles faltan o son inválidas (sin mostrar valores).
 * Uso: node scripts/check-env.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const envLocal = path.join(root, ".env.local");
const envFile = path.join(root, ".env");

function loadEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

const env = { ...process.env, ...loadEnv(envFile), ...loadEnv(envLocal) };

const checks = [
  {
    key: "DATABASE_URL",
    required: true,
    validate: (v) => v && v.length > 10 && (v.startsWith("postgresql://") || v.startsWith("postgres://")),
    hint: "Debe ser una URL PostgreSQL (postgresql://usuario:password@host:puerto/base)",
  },
  {
    key: "JWT_SECRET",
    required: true,
    validate: (v) => v && v.length >= 32,
    hint: "Mínimo 32 caracteres, valor aleatorio seguro",
  },
  {
    key: "BLOB_READ_WRITE_TOKEN",
    required: false,
    validate: (v) => !v || (v.length > 10 && (v.startsWith("vercel_blob_") || v.includes("_"))),
    hint: "Token de Vercel Blob (solo necesario para subir imágenes en admin)",
  },
  {
    key: "SMTP_USER",
    required: false,
    validate: () => true,
    hint: "Email para envío (SMTP). Opcional en desarrollo.",
  },
  {
    key: "SMTP_PASS",
    required: false,
    validate: () => true,
    hint: "Contraseña/App password del email. Opcional en desarrollo.",
  },
  {
    key: "NEXT_PUBLIC_APP_URL",
    required: false,
    validate: (v) =>
      !v ||
      (v.length > 0 && v.length < 500 && !/\s/.test(v)),
    hint: "URL o dominio (ej. https://midominio.com o localhost:3000). Opcional; si no tiene protocolo se usará https://.",
  },
  {
    key: "MASTER_SETUP_SECRET",
    required: false,
    validate: () => true,
    hint: "Requerido en producción para /api/setup/create-master. Opcional en desarrollo.",
  },
];

let hasError = false;
const missing = [];
const invalid = [];

for (const { key, required, validate, hint } of checks) {
  const value = env[key];
  if (value === undefined || value === "") {
    if (required) {
      missing.push({ key, hint });
      hasError = true;
    }
    continue;
  }
  if (!validate(value)) {
    invalid.push({ key, hint });
    if (required) hasError = true;
  }
}

const usedFile = fs.existsSync(envLocal) ? ".env.local" : fs.existsSync(envFile) ? ".env" : "ninguno";
console.log("Archivo cargado:", usedFile);
console.log("");

if (missing.length) {
  console.log("❌ Variables OBLIGATORIAS faltantes:");
  missing.forEach(({ key, hint }) => console.log("   ", key, "->", hint));
  console.log("");
}

if (invalid.length) {
  console.log("⚠️  Variables con valor inválido o sospechoso:");
  invalid.forEach(({ key, hint }) => console.log("   ", key, "->", hint));
  console.log("");
}

if (!hasError && missing.length === 0 && invalid.length === 0) {
  console.log("✅ Variables obligatorias presentes y válidas.");
  process.exit(0);
}

if (missing.length > 0) {
  console.log("Añade las variables faltantes a .env.local (o .env). Puedes basarte en .env.example.");
  process.exit(1);
}

if (invalid.length > 0 && hasError) {
  process.exit(1);
}

process.exit(0);
