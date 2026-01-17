#!/usr/bin/env node

/**
 * Script para aplicar migraciones en Vercel
 * Maneja el caso de base de datos existente (P3005) haciendo baseline automático
 * También crea/actualiza el usuario MASTER automáticamente
 */

import { execSync } from 'child_process';
import { readdirSync } from 'fs';
import { join } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

const MIGRATIONS_DIR = './prisma/migrations';

function getAllMigrations() {
  try {
    const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .filter(name => name !== 'migration_lock.toml')
      .sort();
    return dirs;
  } catch (error) {
    console.error('Error leyendo migraciones:', error);
    return [];
  }
}

function tryMigrateDeploy() {
  try {
    console.log('🔄 Intentando aplicar migraciones con prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Migraciones aplicadas exitosamente');
    return true;
  } catch (error) {
    const errorMessage = error.message || error.toString();
    
    // Si es error P3009 (migración fallida), intentar resolverlo
    if (errorMessage.includes('P3009') || errorMessage.includes('failed migrations')) {
      console.log('⚠️  Detectada migración fallida (P3009)');
      console.log('⚠️  Intentando resolver con prisma migrate resolve...');
      return tryResolveAndRetry();
    }
    
    // Si es error P3005 (base de datos no vacía), hacer baseline
    if (errorMessage.includes('P3005') || errorMessage.includes('database schema is not empty')) {
      console.log('⚠️  Base de datos ya tiene esquema. Haciendo baseline de migraciones...');
      return tryBaseline();
    }
    
    // Si es otro error, intentar con db push como fallback
    console.log('⚠️  prisma migrate deploy falló. Intentando con prisma db push...');
    return tryDbPush();
  }
}

function tryResolveAndRetry() {
  try {
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('🔧 ESTRATEGIA: Intentando resolver migraciones fallidas');
    console.log('═══════════════════════════════════════════════════════');
    
    // Obtener el nombre de la migración fallida
    const migrations = getAllMigrations();
    if (migrations.length === 0) {
      console.log('❌ No se encontraron migraciones');
      console.log('⚠️  Pasando a estrategia alternativa (db push)...\n');
      return tryDbPush();
    }
    
    console.log(`📋 Encontradas ${migrations.length} migraciones`);
    
    // Intentar marcar todas las migraciones como aplicadas (resolve)
    console.log('🔄 Marcando migraciones como resueltas...');
    for (const migration of migrations) {
      try {
        execSync(`npx prisma migrate resolve --applied "${migration}"`, {
          stdio: 'pipe',
          env: process.env
        });
        console.log(`   ✅ Migración "${migration}" marcada como aplicada`);
      } catch (e) {
        // Continuar aunque falle
        console.log(`   ⚠️  No se pudo resolver "${migration}"`);
      }
    }
    
    // Intentar de nuevo migrate deploy
    console.log('🔄 Reintentando prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Migraciones aplicadas exitosamente\n');
    return true;
  } catch (error) {
    console.log('\n❌ No se pudo resolver automáticamente con migrate resolve');
    console.log('⚠️  Pasando a estrategia alternativa (db push)...\n');
    return tryDbPush();
  }
}

function tryBaseline() {
  try {
    console.log('📋 Base de datos ya tiene esquema. Usando prisma db push para sincronizar...');
    console.log('ℹ️  Esto sincronizará el esquema sin requerir baseline manual.');
    return tryDbPush();
  } catch (error) {
    console.error('❌ Error en baseline:', error.message);
    return false;
  }
}

function tryAddProblematicColumns() {
  if (!process.env.DATABASE_URL) {
    console.log('⚠️  DATABASE_URL no disponible, saltando pre-fix de columnas');
    return;
  }

  try {
    console.log('\n🔧 Intentando agregar columnas problemáticas con defaults...');
    
    // Agregar columna `type` a RaffleTemplate si no existe
    console.log('   • Agregando columna "type" a RaffleTemplate...');
    execSync(
      `psql "${process.env.DATABASE_URL}" -c "ALTER TABLE \\"RaffleTemplate\\" ADD COLUMN IF NOT EXISTS type \\"DrawType\\" DEFAULT 'NUMBERS';"`,
      { stdio: 'pipe', env: process.env }
    );
    console.log('   ✅ Columna "type" agregada o ya existe');

    // Agregar columna `updatedAt` a Notification si no existe
    console.log('   • Agregando columna "updatedAt" a Notification...');
    execSync(
      `psql "${process.env.DATABASE_URL}" -c "ALTER TABLE \\"Notification\\" ADD COLUMN IF NOT EXISTS \\"updatedAt\\" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;"`,
      { stdio: 'pipe', env: process.env }
    );
    console.log('   ✅ Columna "updatedAt" agregada o ya existe');
    
    console.log('✅ Pre-fix de columnas completado\n');
  } catch (error) {
    console.log('⚠️  No se pudieron agregar columnas con defaults (esto es normal si las tablas no existen)');
    console.log('   Continuando con el flujo normal...\n');
  }
}

function tryDbPush() {
  // Intentar agregar columnas problemáticas con defaults ANTES de db push
  tryAddProblematicColumns();
  
  try {
    console.log('🔄 Sincronizando esquema con prisma db push...');
    console.log('ℹ️  Esto actualizará el esquema de la base de datos para que coincida con Prisma.');
    
    // Capturar stdout y stderr para poder analizar el error completo
    const result = execSync('npx prisma db push --accept-data-loss', {
      stdio: 'pipe', // Cambiar a 'pipe' para capturar salida
      env: process.env,
      encoding: 'utf8'
    });
    
    console.log(result); // Mostrar la salida
    console.log('✅ Esquema sincronizado exitosamente');
    return true;
  } catch (error) {
    // Capturar TANTO el mensaje de error como stdout/stderr
    const errorMsg = error.message || '';
    const stdout = error.stdout || '';
    const stderr = error.stderr || '';
    const fullOutput = `${errorMsg}\n${stdout}\n${stderr}`.toLowerCase();
    
    console.log('📋 Salida del comando db push:');
    if (stdout) console.log(stdout);
    if (stderr) console.log(stderr);
    
    // Si el error es que no hay cambios, está bien
    if (fullOutput.includes('already in sync') || 
        fullOutput.includes('no schema changes') || 
        fullOutput.includes('already up to date')) {
      console.log('ℹ️  El esquema ya está sincronizado. Continuando...');
      return true;
    }
    
    // Si el error es por cambios que no se pueden ejecutar (columnas requeridas sin default)
    // NOTA: Ya no usamos force-reset automático para preservar datos de producción
    if (fullOutput.includes('cannot be executed') || 
        fullOutput.includes('added the required column') || 
        fullOutput.includes('without a default value') ||
        fullOutput.includes('raffletemplate') ||
        fullOutput.includes('notification') ||
        fullOutput.includes('it is not possible to execute this step')) {
      console.error('❌ Cambios que no se pueden ejecutar detectados');
      console.error('⚠️  El esquema requiere cambios que no se pueden aplicar automáticamente.');
      console.error('⚠️  Esto puede deberse a columnas requeridas sin valores por defecto.');
      console.error('\n📋 SOLUCIONES POSIBLES:');
      console.error('   1. Agregar valores por defecto a las columnas en el schema.prisma');
      console.error('   2. Hacer las columnas opcionales (agregar ?)');
      console.error('   3. Crear una migración personalizada que maneje los datos existentes');
      console.error('   4. Si es un entorno de desarrollo/prueba, resetear manualmente:');
      console.error('      npx prisma db push --force-reset --accept-data-loss\n');
      return false;
    }
    
    console.error('❌ Error en db push:', errorMsg.substring(0, 300));
    console.error('⚠️  Continuando con el build...');
    console.error('⚠️  Asegúrate de que el esquema de la base de datos esté actualizado manualmente.');
    // No fallar el build, solo advertir
    return false;
  }
}

// Función deshabilitada para evitar pérdida de datos en producción
// Si necesitas resetear la base de datos, hazlo manualmente con:
// npx prisma db push --force-reset --accept-data-loss
function tryForceReset() {
  console.error('\n⚠️⚠️⚠️ FORCE RESET DESHABILITADO ⚠️⚠️⚠️');
  console.error('Esta función ha sido deshabilitada para proteger los datos de producción.');
  console.error('Si necesitas resetear la base de datos manualmente, ejecuta:');
  console.error('  npx prisma db push --force-reset --accept-data-loss\n');
  return false;
}

async function createMasterUser() {
  let prisma;
  let pool;
  
  try {
    console.log('\n👤 Verificando/creando usuario MASTER...');
    
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const documentId = "V-0995697717";
    const nationalId = "0995697717";
    const nationalIdType = "V";

    // Prisma Postgres requiere adapter
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL no está definida');
      return false;
    }

    pool = new Pool({ connectionString: databaseUrl });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });

    const existingMaster = await prisma.user.findUnique({
      where: { email }
    });

    const passwordHash = await bcrypt.hash(password, 10);

    if (existingMaster) {
      // Actualizar el usuario existente
      await prisma.user.update({
        where: { email },
        data: {
          passwordHash,
          role: 'MASTER',
          emailVerified: true,
          emailVerifiedAt: new Date(),
          suspended: false,
          documentId: existingMaster.documentId || documentId,
          nationalId: existingMaster.nationalId || nationalId,
          nationalIdType: existingMaster.nationalIdType || nationalIdType,
        }
      });
      console.log('✅ Administrador MASTER actualizado');
      console.log(`   Email: ${email}`);
    } else {
      // Crear nuevo administrador MASTER
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
          nationalIdType
        }
      });
      console.log('✅ Administrador MASTER creado');
      console.log(`   Email: ${email}`);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error al crear/actualizar usuario MASTER:', error.message);
    return false;
  } finally {
    if (prisma) {
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  }
}

// Ejecutar
const success = tryMigrateDeploy();

if (!success) {
  console.warn('⚠️  No se pudieron aplicar migraciones, pero continuando con el build...');
  console.warn('⚠️  Asegúrate de aplicar las migraciones manualmente si es necesario.');
}

// Crear usuario MASTER
createMasterUser()
  .then((created) => {
    if (!created) {
      console.warn('⚠️  No se pudo crear el usuario MASTER automáticamente.');
      console.warn('⚠️  Podrás crearlo manualmente visitando: /api/setup/create-master');
    }
    process.exit(0); // No fallar el build
  })
  .catch((error) => {
    console.error('❌ Error fatal:', error);
    process.exit(0); // No fallar el build incluso si falla
  });
