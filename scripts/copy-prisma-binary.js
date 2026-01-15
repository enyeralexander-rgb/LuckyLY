#!/usr/bin/env node
/**
 * Script para copiar el binario de Prisma Query Engine al directorio correcto
 * Esto asegura que Vercel pueda encontrar el binario en runtime
 */
const fs = require('fs');
const path = require('path');

const prismaClientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
const binaryName = 'libquery_engine-rhel-openssl-3.0.x.so.node';
const binaryPath = path.join(prismaClientPath, binaryName);

// Verificar si el binario existe
if (fs.existsSync(binaryPath)) {
  console.log(`✅ Binario de Prisma encontrado: ${binaryPath}`);
  
  // Copiar al directorio .next/server si existe
  const nextServerPath = path.join(process.cwd(), '.next', 'server');
  if (fs.existsSync(nextServerPath)) {
    const targetPath = path.join(nextServerPath, binaryName);
    try {
      fs.copyFileSync(binaryPath, targetPath);
      console.log(`✅ Binario copiado a: ${targetPath}`);
    } catch (error) {
      console.warn(`⚠️  No se pudo copiar el binario: ${error.message}`);
    }
  }
} else {
  console.warn(`⚠️  Binario de Prisma no encontrado: ${binaryPath}`);
  console.warn('   Asegúrate de ejecutar "prisma generate" primero');
}
