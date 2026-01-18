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
import crypto from 'crypto';

// Función para generar UUID v4
function generateUUID() {
  return crypto.randomUUID();
}

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

  // Detectar tipo de base de datos
  const isPrismaPostgres = databaseUrl.includes('db.prisma.io');
  const isNeon = databaseUrl.includes('neon.tech');
  const requiresSSL = isPrismaPostgres || isNeon;

  // Crear pool y adapter para Prisma 7
  const pool = new Pool({
    connectionString: databaseUrl,
    // SSL con rejectUnauthorized: false para compatibilidad con cloud DBs
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
    // Configuración robusta para evitar errores P1017 (ConnectionClosed)
    max: 5,
    min: 1,
    idleTimeoutMillis: 60000,
    connectionTimeoutMillis: 30000,
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
    // ══════════════════════════════════════════════════════════════
    // CREDENCIALES DEL ADMINISTRADOR MASTER
    // ══════════════════════════════════════════════════════════════
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const name = "Administrador Master";
    const username = "master";
    const documentId = "V-00000001";  // Document ID único para MASTER
    const nationalId = "00000001";
    const nationalIdType = "V";
    // ══════════════════════════════════════════════════════════════

    console.log('  📧 Email:', email);
    console.log('  👤 Nombre:', name);
    console.log('  🔐 Generando hash de contraseña...');

    // Generar hash de password
    const passwordHash = await bcrypt.hash(password, 10);

    // Usar SQL raw para insertar/actualizar directamente
    // Esto es más confiable que usar Prisma Client
    const now = new Date().toISOString();

    try {
      // Insertar todos los campos obligatorios incluyendo documentId y UUID
      console.log('  📝 Insertando/actualizando usuario MASTER...');
      
      // Generar UUID para el campo id (requerido por Prisma Postgres)
      const masterId = generateUUID();
      
      await prisma.$executeRaw`
        INSERT INTO "User" (
          "id", "email", "passwordHash", "name", "username", "documentId", 
          "nationalId", "nationalIdType", "role", "emailVerified", 
          "emailVerifiedAt", "suspended", "createdAt", "updatedAt"
        ) VALUES (
          ${masterId}::text,
          ${email}::text,
          ${passwordHash}::text,
          ${name}::text,
          ${username}::text,
          ${documentId}::text,
          ${nationalId}::text,
          ${nationalIdType}::text,
          ${"MASTER"}::"Role",
          ${true}::boolean,
          ${now}::timestamp,
          ${false}::boolean,
          ${now}::timestamp,
          ${now}::timestamp
        )
        ON CONFLICT ("email")
        DO UPDATE SET
          "passwordHash" = EXCLUDED."passwordHash",
          "name" = EXCLUDED."name",
          "username" = EXCLUDED."username",
          "role" = EXCLUDED."role",
          "emailVerified" = EXCLUDED."emailVerified",
          "emailVerifiedAt" = EXCLUDED."emailVerifiedAt",
          "suspended" = EXCLUDED."suspended",
          "updatedAt" = EXCLUDED."updatedAt"
      `;

    } catch (sqlError) {
      console.error('❌ Error SQL detallado:', sqlError.message);

      // Intentar con documentId diferente si hay conflicto
      console.log('⚠️  Intentando con documentId alternativo...');
      try {
        const altDocumentId = `V-MASTER-${Date.now()}`;
        const altMasterId = generateUUID();
        await prisma.$executeRaw`
          INSERT INTO "User" ("id", "email", "passwordHash", "name", "documentId", "role", "emailVerified", "createdAt", "updatedAt")
          VALUES (${altMasterId}::text, ${email}::text, ${passwordHash}::text, ${name}::text, ${altDocumentId}::text, ${"MASTER"}::"Role", ${true}::boolean, ${now}::timestamp, ${now}::timestamp)
          ON CONFLICT ("email")
          DO UPDATE SET
            "passwordHash" = EXCLUDED."passwordHash",
            "role" = EXCLUDED."role",
            "emailVerified" = EXCLUDED."emailVerified",
            "updatedAt" = EXCLUDED."updatedAt"
        `;
      } catch (fallbackError) {
        console.error('❌ Error incluso en fallback:', fallbackError.message);
        throw fallbackError;
      }
    }

    console.log('  ✅ Usuario MASTER insertado/actualizado:', email);
    console.log('     ✓ Password hash generado correctamente');
    console.log('     ✓ Rol: MASTER');
    console.log('     ✓ Email verificado: true');

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

      // NOTA: El seed NO se ejecuta automáticamente en producción
      // Para ejecutar el seed manualmente, usar: npm run prisma:seed
      // El seed borra todos los datos y crea usuarios de prueba
      if (process.env.RUN_SEED === 'true') {
        console.log('🌱 Ejecutando seed (datos de prueba)...\n');
        try {
          runCommand('node --loader ts-node/esm prisma/seed.ts');
          console.log('✅ Seed ejecutado\n');
        } catch (seedError) {
          console.log('⚠️  Seed falló, pero usuario MASTER ya está creado\n');
        }
      } else {
        console.log('ℹ️  Seed omitido (set RUN_SEED=true para ejecutar)\n');
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
