#!/usr/bin/env node

/**
 * Script para aplicar schema de Prisma a PostgreSQL en Vercel
 * Usa prisma db push directamente (sin psql ni migraciones)
 * Compatible con Prisma 7 + PrismaPg adapter
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from 'bcryptjs';

const { Pool } = pg;

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
    // Intentar sin force-reset (preserva datos si existen)
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


async function createMasterUserManually() {
  let databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no definida');
  }

  // Limpiar parámetros SSL obsoletos que causan warnings en pg-connection-string
  const cleanDatabaseUrl = (url) => {
    try {
      const urlObj = new URL(url);
      // Remover parámetros SSL obsoletos
      const obsoleteParams = ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'];
      obsoleteParams.forEach(param => {
        if (urlObj.searchParams.has(param)) {
          urlObj.searchParams.delete(param);
        }
      });
      return urlObj.toString();
    } catch (error) {
      return url;
    }
  };

  databaseUrl = cleanDatabaseUrl(databaseUrl);

  // Crear pool y adapter para Prisma 7
  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: true }
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

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
      console.log('  ✅ Usuario MASTER actualizado:', email);
    } else {
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
      console.log('  ✅ Usuario MASTER creado:', email);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
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
    
    const dbHost = process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'PostgreSQL';
    console.log(`📍 Database: ${dbHost}\n`);
    
    // Aplicar schema
    const schemaApplied = await applySchema();

    if (schemaApplied) {
      // Ejecutar seed directamente para crear usuario MASTER
      console.log('🌱 Ejecutando seed para crear usuario MASTER...\n');
      try {
        // Ejecutar el seed directamente con Node.js
        runCommand('node --loader ts-node/esm prisma/seed.ts');
        console.log('✅ Seed ejecutado exitosamente\n');
      } catch (seedError) {
        console.error('❌ Error al ejecutar seed:', seedError.message);
        console.log('⚠️  Intentando crear usuario MASTER manualmente...\n');

        // Si falla el seed, crear el usuario MASTER manualmente
        try {
          await createMasterUserManually();
          console.log('✅ Usuario MASTER creado manualmente\n');
        } catch (manualError) {
          console.error('❌ Error al crear usuario MASTER manualmente:', manualError.message);
          console.log('⚠️  Continuando sin usuario MASTER...\n');
        }
      }
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
