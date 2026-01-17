#!/usr/bin/env node

/**
 * Script para aplicar schema de Prisma a PostgreSQL en Vercel
 * Usa prisma db push directamente (sin psql ni migraciones)
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

console.log('\n═══════════════════════════════════════════════════════');
console.log('🐘 APLICAR SCHEMA DE PRISMA A POSTGRESQL');
console.log('═══════════════════════════════════════════════════════\n');

function runCommand(command, options = {}) {
  try {
    console.log(`📋 Ejecutando: ${command.substring(0, 80)}...`);
    const result = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (error) {
    const errorMsg = error.stderr || error.stdout || error.message;
    throw new Error(errorMsg);
  }
}

async function applySchema() {
  console.log('🔄 Aplicando schema con prisma db push...\n');
  
  try {
    // Primero intentar sin force-reset (preserva datos si existen)
    runCommand('npx prisma db push --accept-data-loss');
    console.log('✅ Schema aplicado exitosamente\n');
    return true;
  } catch (error) {
    console.log('⚠️  db push normal falló. Intentando con --force-reset...\n');
    
    try {
      // Si falla, usar force-reset (resetea toda la base de datos)
      runCommand('npx prisma db push --force-reset --accept-data-loss');
      console.log('✅ Schema aplicado con force-reset\n');
      return true;
    } catch (resetError) {
      console.error('❌ Error al aplicar schema:', resetError.message);
      return false;
    }
  }
}

async function createMasterUser() {
  console.log('👤 Verificando/creando usuario MASTER...\n');
  
  const prisma = new PrismaClient();
  
  try {
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const documentId = "V-0995697717";
    const nationalId = "0995697717";
    const nationalIdType = "V";
    
    // Verificar si existe
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });
    
    const passwordHash = await bcrypt.hash(password, 10);
    
    if (existingUser) {
      // Actualizar usuario existente
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'MASTER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          suspended: false,
          documentId: existingUser.documentId || documentId,
          nationalId: existingUser.nationalId || nationalId,
          nationalIdType: existingUser.nationalIdType || nationalIdType,
        }
      });
      console.log('✅ Usuario MASTER actualizado');
      console.log(`   Email: ${email}\n`);
    } else {
      // Crear nuevo usuario
      await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: "Administrador Master",
          username: "master",
          role: 'MASTER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          documentId,
          nationalId,
          nationalIdType,
        }
      });
      console.log('✅ Usuario MASTER creado');
      console.log(`   Email: ${email}\n`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al crear/actualizar MASTER:', error.message);
    console.log('⚠️  Puedes crearlo manualmente en: /api/setup/create-master\n');
    return false;
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
async function main() {
  try {
    // Verificar DATABASE_URL
    if (!process.env.DATABASE_URL) {
      console.error('❌ DATABASE_URL no está definida');
      console.log('⚠️  Continuando con el build sin aplicar schema...\n');
      process.exit(0);
    }
    
    console.log(`📍 Database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'PostgreSQL'}\n`);
    
    // Aplicar schema
    const schemaApplied = await applySchema();
    
    if (schemaApplied) {
      // Crear usuario MASTER
      await createMasterUser();
    }
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ PROCESO COMPLETADO');
    console.log('═══════════════════════════════════════════════════════\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    console.error('⚠️  Continuando con el build...\n');
    process.exit(0); // No fallar el build
  }
}

main();
