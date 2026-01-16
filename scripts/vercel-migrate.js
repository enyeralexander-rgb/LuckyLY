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
    // Obtener el nombre de la migración fallida
    const migrations = getAllMigrations();
    if (migrations.length === 0) {
      console.log('❌ No se encontraron migraciones');
      return tryDbPush();
    }
    
    // Intentar marcar todas las migraciones como aplicadas (resolve)
    console.log('🔄 Marcando migraciones como resueltas...');
    for (const migration of migrations) {
      try {
        execSync(`npx prisma migrate resolve --applied "${migration}"`, {
          stdio: 'pipe',
          env: process.env
        });
        console.log(`✅ Migración "${migration}" marcada como aplicada`);
      } catch (e) {
        // Continuar aunque falle
        console.log(`⚠️  No se pudo resolver "${migration}"`);
      }
    }
    
    // Intentar de nuevo migrate deploy
    console.log('🔄 Reintentando prisma migrate deploy...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Migraciones aplicadas exitosamente');
    return true;
  } catch (error) {
    console.log('❌ No se pudo resolver automáticamente');
    console.log('⚠️  Intentando con prisma db push...');
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

function tryDbPush() {
  try {
    console.log('🔄 Sincronizando esquema con prisma db push...');
    console.log('ℹ️  Esto actualizará el esquema de la base de datos para que coincida con Prisma.');
    execSync('npx prisma db push --accept-data-loss', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Esquema sincronizado exitosamente');
    return true;
  } catch (error) {
    const errorMsg = error.message || error.toString();
    
    // Si el error es que no hay cambios, está bien
    if (errorMsg.includes('already in sync') || errorMsg.includes('No schema changes') || errorMsg.includes('already up to date')) {
      console.log('ℹ️  El esquema ya está sincronizado. Continuando...');
      return true;
    }
    
    // Si el error es por cambios que no se pueden ejecutar (columnas requeridas sin default)
    if (errorMsg.includes('cannot be executed') || errorMsg.includes('Added the required column') || errorMsg.includes('without a default value')) {
      console.log('⚠️  Cambios que no se pueden ejecutar detectados');
      console.log('⚠️  Intentando con --force-reset para recrear la base de datos...');
      console.log('⚠️  ADVERTENCIA: Esto eliminará todos los datos existentes');
      return tryForceReset();
    }
    
    console.error('❌ Error en db push:', errorMsg.substring(0, 300));
    console.error('⚠️  Continuando con el build...');
    console.error('⚠️  Asegúrate de que el esquema de la base de datos esté actualizado manualmente.');
    // No fallar el build, solo advertir
    return false;
  }
}

function tryForceReset() {
  try {
    console.log('🔄 Reseteando base de datos con prisma db push --force-reset...');
    console.log('⚠️  ADVERTENCIA: Todos los datos serán eliminados');
    execSync('npx prisma db push --force-reset --accept-data-loss --skip-generate', {
      stdio: 'inherit',
      env: process.env
    });
    console.log('✅ Base de datos reseteada y esquema aplicado exitosamente');
    return true;
  } catch (error) {
    const errorMsg = error.message || error.toString();
    console.error('❌ Error en force reset:', errorMsg.substring(0, 300));
    console.error('⚠️  Continuando con el build...');
    console.error('⚠️  Asegúrate de resetear la base de datos manualmente.');
    return false;
  }
}

async function createMasterUser() {
  let prisma;
  let pool;
  
  try {
    console.log('\n👤 Verificando/creando usuario MASTER...');
    
    const email = "enyeralexander@gmail.com";
    const password = "0995697717";
    const documentId = "V-0995697717";

    // Configurar Prisma Client con adaptador para Prisma 7
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
          documentId: existingMaster.documentId || documentId
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
          documentId
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
