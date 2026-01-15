#!/usr/bin/env node
/**
 * Script para copiar el binario de Prisma Query Engine a múltiples ubicaciones
 * Esto asegura que Vercel pueda encontrar el binario en runtime
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const binaryName = 'libquery_engine-rhel-openssl-3.0.x.so.node';
const binaryPath = path.join(prismaClientPath, binaryName);

// Verificar si el binario existe
if (!fs.existsSync(binaryPath)) {
  console.warn(`⚠️  Binario de Prisma no encontrado: ${binaryPath}`);
  console.warn('   Asegúrate de ejecutar "prisma generate" primero');
  process.exit(1);
}

console.log(`✅ Binario de Prisma encontrado: ${binaryPath}`);

// Función para copiar el binario a una ubicación
function copyBinary(source, target) {
  try {
    // Crear directorio si no existe
    const targetDir = path.dirname(target);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }
    
    fs.copyFileSync(source, target);
    console.log(`✅ Binario copiado a: ${target}`);
    return true;
  } catch (error) {
    console.warn(`⚠️  No se pudo copiar a ${target}: ${error.message}`);
    return false;
  }
}

// Ubicaciones donde Prisma busca el binario en Vercel
const targetLocations = [
  // 1. .next/server (donde Next.js coloca el código del servidor)
  path.join(process.cwd(), '.next', 'server', binaryName),
  
  // 2. .next/server/chunks (donde Next.js coloca chunks)
  path.join(process.cwd(), '.next', 'server', 'chunks', binaryName),
  
  // 3. node_modules/.prisma/client (ubicación estándar)
  path.join(process.cwd(), 'node_modules', '.prisma', 'client', binaryName),
  
  // 4. .prisma/client (ubicación alternativa)
  path.join(process.cwd(), '.prisma', 'client', binaryName),
];

let copiedCount = 0;
for (const target of targetLocations) {
  if (copyBinary(binaryPath, target)) {
    copiedCount++;
  }
}

if (copiedCount === 0) {
  console.error('❌ No se pudo copiar el binario a ninguna ubicación');
  process.exit(1);
}

console.log(`\n✅ Binario copiado a ${copiedCount} ubicación(es)`);
