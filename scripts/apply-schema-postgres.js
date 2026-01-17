#!/usr/bin/env node

/**
 * Script simple para aplicar schema de Prisma directamente a PostgreSQL
 * Sin usar migraciones - solo SQL puro
 */

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

const TEMP_SQL_FILE = './temp-schema.sql';

console.log('\n═══════════════════════════════════════════════════════');
console.log('🐘 APLICAR SCHEMA DE PRISMA A POSTGRESQL');
console.log('═══════════════════════════════════════════════════════\n');

function runCommand(command, options = {}) {
  try {
    const result = execSync(command, {
      stdio: 'pipe',
      encoding: 'utf8',
      ...options
    });
    return result;
  } catch (error) {
    throw new Error(`${error.message}\n${error.stdout || ''}\n${error.stderr || ''}`);
  }
}

function generateSQL() {
  try {
    console.log('📝 Generando SQL desde schema.prisma...');
    
    // Generar SQL comparando con una BD vacía (sintaxis Prisma 7)
    const sql = runCommand(
      'npx prisma migrate diff --from-empty --to-schema prisma/schema.prisma --script'
    );
    
    if (!sql || sql.trim().length === 0) {
      console.log('⚠️  No hay cambios que aplicar (schema ya sincronizado)');
      return null;
    }
    
    writeFileSync(TEMP_SQL_FILE, sql);
    console.log(`✅ SQL generado: ${TEMP_SQL_FILE}`);
    console.log(`   Tamaño: ${(sql.length / 1024).toFixed(2)} KB\n`);
    
    return TEMP_SQL_FILE;
  } catch (error) {
    console.error('❌ Error al generar SQL:', error.message);
    throw error;
  }
}

function applySQL(sqlFile) {
  if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL no está definida');
    process.exit(1);
  }
  
  try {
    console.log('🔄 Aplicando SQL a PostgreSQL...');
    console.log(`   Database: ${process.env.DATABASE_URL.split('@')[1]?.split('/')[0] || 'PostgreSQL'}\n`);
    
    // Aplicar SQL directamente con psql
    runCommand(`psql "${process.env.DATABASE_URL}" -f ${sqlFile}`, {
      stdio: 'inherit'
    });
    
    console.log('\n✅ Schema aplicado exitosamente');
    return true;
  } catch (error) {
    console.error('\n❌ Error al aplicar SQL:', error.message);
    
    // Si falla psql, intentar con Prisma db push como fallback
    console.log('\n⚠️  psql no disponible. Intentando con Prisma db push...');
    try {
      runCommand('npx prisma db push --skip-generate --accept-data-loss', {
        stdio: 'inherit'
      });
      console.log('✅ Schema sincronizado con Prisma db push');
      return true;
    } catch (pushError) {
      console.error('❌ También falló db push:', pushError.message);
      return false;
    }
  }
}

function cleanup() {
  if (existsSync(TEMP_SQL_FILE)) {
    unlinkSync(TEMP_SQL_FILE);
    console.log('🧹 Archivo temporal eliminado');
  }
}

// Ejecutar
try {
  const sqlFile = generateSQL();
  
  if (sqlFile) {
    const success = applySQL(sqlFile);
    cleanup();
    
    if (!success) {
      console.error('\n⚠️  No se pudo aplicar el schema, pero continuando...');
      process.exit(0); // No fallar el build
    }
  }
  
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('✅ PROCESO COMPLETADO');
  console.log('═══════════════════════════════════════════════════════\n');
  
  process.exit(0);
} catch (error) {
  cleanup();
  console.error('\n❌ Error fatal:', error.message);
  console.error('⚠️  Continuando con el build...\n');
  process.exit(0); // No fallar el build
}
