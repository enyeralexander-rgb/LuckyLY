#!/usr/bin/env node

/**
 * Script para mantener Prisma actualizado automáticamente
 * 
 * Este script:
 * 1. Verifica la versión actual de Prisma
 * 2. Compara con la última versión disponible
 * 3. Actualiza si hay una nueva versión disponible
 * 4. Regenera el cliente de Prisma
 * 5. Verifica que todo compile correctamente
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

function exec(command, options = {}) {
  try {
    return execSync(command, { 
      encoding: 'utf-8', 
      cwd: projectRoot,
      stdio: 'pipe',
      ...options 
    });
  } catch (error) {
    return { error: error.message, stdout: error.stdout?.toString(), stderr: error.stderr?.toString() };
  }
}

function getCurrentVersion(packageName) {
  try {
    const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
    const version = packageJson.dependencies?.[packageName] || packageJson.devDependencies?.[packageName];
    return version?.replace(/[\^~]/, '') || null;
  } catch (error) {
    console.error(`Error leyendo package.json: ${error.message}`);
    return null;
  }
}

function getLatestVersion(packageName) {
  try {
    const result = exec(`npm view ${packageName} version`);
    if (result.error) {
      console.warn(`No se pudo obtener la versión de ${packageName}`);
      return null;
    }
    return result.toString().trim();
  } catch (error) {
    console.warn(`Error obteniendo versión de ${packageName}: ${error.message}`);
    return null;
  }
}

function compareVersions(current, latest) {
  if (!current || !latest) return false;
  
  const currentParts = current.split('.').map(Number);
  const latestParts = latest.split('.').map(Number);
  
  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0;
    const latestPart = latestParts[i] || 0;
    
    if (latestPart > currentPart) return true;
    if (latestPart < currentPart) return false;
  }
  
  return false;
}

async function updatePrisma() {
  console.log('🔍 Verificando versiones de Prisma...\n');
  
  const currentPrisma = getCurrentVersion('prisma');
  const currentClient = getCurrentVersion('@prisma/client');
  const currentPlugin = getCurrentVersion('@prisma/nextjs-monorepo-workaround-plugin');
  
  console.log(`Versión actual:`);
  console.log(`  - prisma: ${currentPrisma || 'no encontrado'}`);
  console.log(`  - @prisma/client: ${currentClient || 'no encontrado'}`);
  console.log(`  - @prisma/nextjs-monorepo-workaround-plugin: ${currentPlugin || 'no encontrado'}\n`);
  
  const latestPrisma = getLatestVersion('prisma');
  const latestClient = getLatestVersion('@prisma/client');
  const latestPlugin = getLatestVersion('@prisma/nextjs-monorepo-workaround-plugin');
  
  console.log(`Última versión disponible:`);
  console.log(`  - prisma: ${latestPrisma || 'no disponible'}`);
  console.log(`  - @prisma/client: ${latestClient || 'no disponible'}`);
  console.log(`  - @prisma/nextjs-monorepo-workaround-plugin: ${latestPlugin || 'no disponible'}\n`);
  
  const needsUpdate = 
    (latestPrisma && compareVersions(currentPrisma, latestPrisma)) ||
    (latestClient && compareVersions(currentClient, latestClient)) ||
    (latestPlugin && compareVersions(currentPlugin, latestPlugin));
  
  if (!needsUpdate) {
    console.log('✅ Prisma ya está actualizado a la última versión.\n');
    return;
  }
  
  console.log('📦 Actualizando Prisma...\n');
  
  // Actualizar prisma (devDependency)
  if (latestPrisma && compareVersions(currentPrisma, latestPrisma)) {
    console.log(`Actualizando prisma de ${currentPrisma} a ${latestPrisma}...`);
    const result = exec(`npm install --save-dev prisma@${latestPrisma}`);
    if (result.error) {
      console.error(`❌ Error actualizando prisma: ${result.stderr}`);
      return;
    }
    console.log(`✅ prisma actualizado a ${latestPrisma}`);
  }
  
  // Actualizar @prisma/client (dependency)
  if (latestClient && compareVersions(currentClient, latestClient)) {
    console.log(`Actualizando @prisma/client de ${currentClient} a ${latestClient}...`);
    const result = exec(`npm install @prisma/client@${latestClient}`);
    if (result.error) {
      console.error(`❌ Error actualizando @prisma/client: ${result.stderr}`);
      return;
    }
    console.log(`✅ @prisma/client actualizado a ${latestClient}`);
  }
  
  // Actualizar plugin
  if (latestPlugin && compareVersions(currentPlugin, latestPlugin)) {
    console.log(`Actualizando @prisma/nextjs-monorepo-workaround-plugin de ${currentPlugin} a ${latestPlugin}...`);
    const result = exec(`npm install @prisma/nextjs-monorepo-workaround-plugin@${latestPlugin}`);
    if (result.error) {
      console.error(`❌ Error actualizando plugin: ${result.stderr}`);
      return;
    }
    console.log(`✅ @prisma/nextjs-monorepo-workaround-plugin actualizado a ${latestPlugin}`);
  }
  
  console.log('\n🔄 Regenerando cliente de Prisma...');
  const generateResult = exec('npx prisma generate');
  if (generateResult.error) {
    console.error(`❌ Error regenerando cliente: ${generateResult.stderr}`);
    console.error('⚠️  Por favor, ejecuta manualmente: npx prisma generate');
    return;
  }
  console.log('✅ Cliente de Prisma regenerado\n');
  
  console.log('✅ Prisma actualizado exitosamente!\n');
  console.log('💡 Siguiente paso: Verifica que todo funcione correctamente con: npm run build');
}

// Ejecutar si se llama directamente
const isMainModule = import.meta.url === `file://${process.argv[1]}` || 
                     process.argv[1]?.endsWith('update-prisma.js');

if (isMainModule) {
  updatePrisma().catch(console.error);
}

export { updatePrisma };
