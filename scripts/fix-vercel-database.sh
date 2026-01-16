#!/bin/bash

# ============================================
# SCRIPT PARA REPARAR BASE DE DATOS EN VERCEL
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🔧 REPARACIÓN DE BASE DE DATOS EN VERCEL                     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Verificar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}❌ ERROR: DATABASE_URL no está definida${NC}"
    echo ""
    echo "Por favor, copia la DATABASE_URL desde:"
    echo "1. Neon Console: https://console.neon.tech/"
    echo "2. O desde Vercel: Settings → Environment Variables"
    echo ""
    echo "Luego ejecuta:"
    echo "export DATABASE_URL=\"tu_url_aqui\""
    echo ""
    exit 1
fi

echo -e "${YELLOW}⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de la base de datos${NC}"
echo ""
echo "Base de datos a limpiar:"
echo "$DATABASE_URL" | sed 's/:[^@]*@/:***@/'
echo ""
read -p "¿Estás seguro de continuar? (escribe 'SI' para confirmar): " -r
echo ""

if [ "$REPLY" != "SI" ]; then
    echo -e "${BLUE}ℹ️  Operación cancelada${NC}"
    exit 0
fi

echo -e "${BLUE}🔄 Paso 1/4: Limpiando base de datos...${NC}"
psql "$DATABASE_URL" < scripts/reset-vercel-database.sql

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Base de datos limpiada${NC}"
else
    echo -e "${RED}❌ Error al limpiar la base de datos${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Paso 2/4: Aplicando esquema completo...${NC}"
npx prisma db push --accept-data-loss

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Esquema aplicado${NC}"
else
    echo -e "${RED}❌ Error al aplicar esquema${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Paso 3/4: Generando cliente de Prisma...${NC}"
npx prisma generate

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Cliente generado${NC}"
else
    echo -e "${RED}❌ Error al generar cliente${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔄 Paso 4/4: Creando usuario MASTER...${NC}"
node scripts/create-master-vercel.ts

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Usuario MASTER creado${NC}"
else
    echo -e "${YELLOW}⚠️  No se pudo crear el usuario MASTER automáticamente${NC}"
    echo -e "${YELLOW}   Podrás crearlo visitando: /api/setup/create-master${NC}"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  ✅ ¡REPARACIÓN COMPLETADA!                                   ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo -e "${GREEN}✅ Base de datos reparada exitosamente${NC}"
echo ""
echo "Próximos pasos:"
echo "1. Hacer Redeploy en Vercel"
echo "2. Verificar que el login funcione"
echo ""
