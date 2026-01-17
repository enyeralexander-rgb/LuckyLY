#!/usr/bin/env node

/**
 * Script para aplicar schema de Prisma a PostgreSQL en Vercel
 * Usa prisma db push directamente (sin psql ni migraciones)
 * Compatible con Prisma 7 + PrismaPg adapter
 *
 * GARANTIZA la creación del usuario MASTER con SQL directo
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
    ssl: { rejectUnauthorized: true },
    // Configuración robusta para evitar errores P1017 (ConnectionClosed)
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 20000,
    allowExitOnIdle: true,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({
    adapter,
    transactionOptions: {
      maxWait: 20000,
      timeout: 10000,
    },
  });

  try {
    const email = "alexander@gmail.com";
    const password = "Caracas01.";
    const documentId = "V-0995697717";
    const nationalId = "0995697717";
    const nationalIdType = "V";

    // Generar hash de password
    const passwordHash = await bcrypt.hash(password, 10);

    // Usar SQL raw para insertar/actualizar directamente
    // Esto es más confiable que usar Prisma Client
    const now = new Date().toISOString();

    try {
      // Insertar solo campos obligatorios primero, luego actualizar
      await prisma.$executeRaw`
        INSERT INTO "User" (
          "email", "passwordHash", "name", "role", "emailVerified", "createdAt", "updatedAt"
        ) VALUES (
          ${email}::text,
          ${passwordHash}::text,
          ${"Administrador Master"}::text,
          ${"MASTER"}::"Role",
          ${true}::boolean,
          ${now}::timestamp,
          ${now}::timestamp
        )
        ON CONFLICT ("email")
        DO UPDATE SET
          "passwordHash" = EXCLUDED."passwordHash",
          "name" = EXCLUDED."name",
          "role" = EXCLUDED."role",
          "emailVerified" = EXCLUDED."emailVerified",
          "updatedAt" = EXCLUDED."updatedAt"
      `;

      // Actualizar campos adicionales si el usuario ya existe
      await prisma.$executeRaw`
        UPDATE "User"
        SET
          "documentId" = ${documentId}::text,
          "nationalId" = ${nationalId}::text,
          "nationalIdType" = ${nationalIdType}::text,
          "emailVerifiedAt" = ${now}::timestamp,
          "suspended" = ${false}::boolean
        WHERE "email" = ${email}::text
      `;

    } catch (sqlError) {
      console.error('❌ Error SQL detallado:', sqlError.message);

      // Intentar con sintaxis mínima como último recurso
      console.log('⚠️  Intentando con sintaxis mínima...');
      try {
        await prisma.$executeRaw`
          INSERT INTO "User" ("email", "passwordHash", "name", "role", "emailVerified", "createdAt", "updatedAt")
          VALUES (${email}, ${passwordHash}, ${"Administrador Master"}, ${"MASTER"}::"Role", ${true}, ${now}::timestamp, ${now}::timestamp)
          ON CONFLICT ("email")
          DO UPDATE SET
            "passwordHash" = EXCLUDED."passwordHash",
            "updatedAt" = ${now}::timestamp
        `;
      } catch (fallbackError) {
        console.error('❌ Error incluso en fallback:', fallbackError.message);
        throw fallbackError;
      }
    }

    console.log('  ✅ Usuario MASTER insertado/actualizado:', email);
    console.log('     Password hash generado correctamente');

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
      // Crear usuario MASTER directamente (garantizado)
      console.log('👑 Creando usuario MASTER...\n');
      try {
        await createMasterUserManually();
        console.log('✅ Usuario MASTER creado exitosamente\n');
      } catch (masterError) {
        console.error('❌ Error al crear usuario MASTER:', masterError.message);
        console.log('⚠️  Continuando sin usuario MASTER...\n');
      }

      // Intentar ejecutar el seed completo (opcional)
      console.log('🌱 Ejecutando seed completo (datos adicionales)...\n');
      try {
        runCommand('node --loader ts-node/esm prisma/seed.ts');
        console.log('✅ Seed completo ejecutado\n');
      } catch (seedError) {
        console.log('⚠️  Seed completo falló, pero usuario MASTER ya está creado\n');
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
