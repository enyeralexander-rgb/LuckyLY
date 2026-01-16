#!/usr/bin/env node
/**
 * Script de post-build para Prisma 7
 * 
 * NOTA: En Prisma 7, ya NO se usan binarios de Rust.
 * Todo el código está en TypeScript y se incluye automáticamente en el bundle.
 * Este script ahora solo verifica que el cliente de Prisma se haya generado correctamente.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prismaClientPath = path.join(process.cwd(), 'node_modules', '@prisma', 'client');

// Verificar que el cliente de Prisma existe
if (!fs.existsSync(prismaClientPath)) {
  console.warn(`⚠️  Cliente de Prisma no encontrado en: ${prismaClientPath}`);
  console.warn('   Ejecuta "npx prisma generate" antes del build');
  console.log('   En Prisma 7, no se necesitan binarios - todo está en TypeScript');
  process.exit(0); // No es crítico, solo un warning
}

console.log(`✅ Cliente de Prisma 7 verificado en: ${prismaClientPath}`);
console.log('   Prisma 7 no requiere binarios - todo está incluido en el bundle de TypeScript');
