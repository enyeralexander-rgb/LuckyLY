#!/usr/bin/env node

/**
 * Script para verificar la conexión a Neon (Postgres 17)
 * Ejecutar: npm run db:verify  o  node scripts/verify-connection.js
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(root, ".env"), quiet: true });
dotenv.config({ path: path.join(root, ".env.local"), quiet: true });

const { Pool } = pg;

console.log('\n═══════════════════════════════════════════════════════');
console.log('🔌 VERIFICAR CONEXIÓN A BASE DE DATOS (Neon Postgres 17)');
console.log('═══════════════════════════════════════════════════════\n');

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ ERROR: DATABASE_URL no está definida');
    console.log('\n📝 Configura .env.local con la URL de Neon, ejemplo:');
    console.log('DATABASE_URL="postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require"');
    process.exit(1);
  }

  const isNeon = databaseUrl.includes('neon.tech');

  console.log('📍 Base de datos:');
  if (isNeon) {
    console.log('   ✅ Neon (Postgres Serverless)');
  } else {
    console.log('   ⚠️  PostgreSQL estándar (recomendado: Neon)');
  }

  // Limpiar URL
  const cleanUrl = (url) => {
    try {
      const urlObj = new URL(url);
      ['sslmode', 'sslcert', 'sslkey', 'sslrootcert'].forEach(param => {
        urlObj.searchParams.delete(param);
      });
      return urlObj.toString();
    } catch {
      return url;
    }
  };

  const cleanedUrl = cleanUrl(databaseUrl);
  const requiresSSL = isNeon;

  console.log('\n🔄 Intentando conectar...\n');

  const pool = new Pool({
    connectionString: cleanedUrl,
    ssl: requiresSSL ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 30000,
  });

  try {
    // Test de conexión
    const client = await pool.connect();
    console.log('✅ Conexión exitosa!\n');

    // Obtener información del servidor
    const versionResult = await client.query('SELECT version()');
    console.log('📊 Información del servidor:');
    console.log(`   ${versionResult.rows[0].version.split(' ').slice(0, 2).join(' ')}\n`);

    // Verificar tablas existentes
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('📋 Tablas existentes:');
      tablesResult.rows.forEach(row => {
        console.log(`   • ${row.table_name}`);
      });
    } else {
      console.log('📋 No hay tablas creadas aún (schema vacío)');
      console.log('   Aplica scripts/schema-neon.sql en Neon Console (SQL Editor) o usa el flujo de despliegue.');
    }

    // Verificar usuario MASTER
    try {
      const masterResult = await client.query(`
        SELECT email, role, "emailVerified" 
        FROM "User" 
        WHERE role = 'MASTER' 
        LIMIT 1
      `);
      
      if (masterResult.rows.length > 0) {
        console.log('\n👑 Usuario MASTER:');
        console.log(`   Email: ${masterResult.rows[0].email}`);
        console.log(`   Verificado: ${masterResult.rows[0].emailVerified ? 'Sí' : 'No'}`);
      } else {
        console.log('\n⚠️  No hay usuario MASTER');
        console.log('   Se creará automáticamente en el siguiente despliegue');
      }
    } catch (e) {
      console.log('\n⚠️  Tabla User no existe aún');
    }

    client.release();
    await pool.end();

    console.log('\n═══════════════════════════════════════════════════════');
    console.log('✅ VERIFICACIÓN COMPLETADA - Todo listo para desplegar');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error de conexión:', error.message);
    
    if (error.message.includes('authentication')) {
      console.log('\n📝 Posibles causas:');
      console.log('   • Credenciales incorrectas en DATABASE_URL');
      console.log('   • La base de datos no existe o está inactiva');
    } else if (error.message.includes('timeout')) {
      console.log('\n📝 Posibles causas:');
      console.log('   • Problema de red');
      console.log('   • Base de datos no accesible');
    }
    
    await pool.end();
    process.exit(1);
  }
}

main();
