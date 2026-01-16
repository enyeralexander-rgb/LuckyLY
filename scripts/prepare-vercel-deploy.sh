#!/bin/bash

# ============================================
# SCRIPT DE PREPARACIÓN PARA DESPLIEGUE EN VERCEL
# ============================================
# Este script verifica que todo esté listo para desplegar
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║  🚀 PREPARACIÓN PARA DESPLIEGUE EN VERCEL                     ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Función para imprimir mensajes
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Verificar que estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    print_error "No se encontró package.json. Ejecuta este script desde la raíz del proyecto."
    exit 1
fi

print_info "Verificando prerequisitos..."
echo ""

# 1. Verificar Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js instalado: $NODE_VERSION"
else
    print_error "Node.js no está instalado"
    exit 1
fi

# 2. Verificar npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm instalado: v$NPM_VERSION"
else
    print_error "npm no está instalado"
    exit 1
fi

# 3. Verificar Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version)
    print_success "Git instalado: $GIT_VERSION"
else
    print_error "Git no está instalado"
    exit 1
fi

# 4. Verificar que existe prisma/schema.prisma
if [ -f "prisma/schema.prisma" ]; then
    print_success "Schema de Prisma encontrado"
else
    print_error "No se encontró prisma/schema.prisma"
    exit 1
fi

# 5. Verificar que existe el esquema SQL
if [ -f "database/SCHEMA_COMPLETO_DEVELOPMENT.sql" ]; then
    print_success "Esquema SQL completo encontrado"
    SQL_LINES=$(wc -l < database/SCHEMA_COMPLETO_DEVELOPMENT.sql)
    print_info "   Líneas: $SQL_LINES"
else
    print_warning "No se encontró database/SCHEMA_COMPLETO_DEVELOPMENT.sql"
    print_info "   Generando esquema SQL..."
    
    # Intentar generar el esquema
    if command -v pg_dump &> /dev/null && [ ! -z "$DATABASE_URL" ]; then
        pg_dump "$DATABASE_URL" --schema-only --no-owner --no-acl > database/SCHEMA_COMPLETO_DEVELOPMENT.sql
        print_success "Esquema SQL generado"
    else
        print_warning "No se pudo generar automáticamente. Usa prisma migrate diff"
    fi
fi

# 6. Verificar que existe vercel.json
if [ -f "vercel.json" ]; then
    print_success "vercel.json encontrado"
else
    print_error "No se encontró vercel.json"
    exit 1
fi

# 7. Verificar scripts
if [ -f "scripts/vercel-migrate.js" ]; then
    print_success "Script de migración de Vercel encontrado"
else
    print_error "No se encontró scripts/vercel-migrate.js"
    exit 1
fi

echo ""
print_info "Verificando dependencias..."
echo ""

# 8. Verificar que node_modules existe
if [ -d "node_modules" ]; then
    print_success "Dependencias instaladas"
else
    print_warning "Dependencias no instaladas"
    print_info "   Ejecutando: npm install"
    npm install
    print_success "Dependencias instaladas"
fi

# 9. Verificar que Prisma Client está generado
if [ -d "node_modules/.prisma/client" ]; then
    print_success "Cliente de Prisma generado"
else
    print_warning "Cliente de Prisma no generado"
    print_info "   Ejecutando: npx prisma generate"
    npx prisma generate
    print_success "Cliente de Prisma generado"
fi

echo ""
print_info "Compilando proyecto..."
echo ""

# 10. Compilar proyecto
if npm run build > /tmp/build.log 2>&1; then
    print_success "Proyecto compilado exitosamente"
else
    print_error "Error al compilar el proyecto"
    print_info "   Ver detalles en: /tmp/build.log"
    tail -20 /tmp/build.log
    exit 1
fi

echo ""
print_info "Verificando estado de Git..."
echo ""

# 11. Verificar estado de Git
if git status --porcelain | grep -q .; then
    print_warning "Hay cambios sin commitear"
    print_info "   Archivos modificados:"
    git status --short | head -10
    echo ""
    read -p "¿Deseas hacer commit de los cambios? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git add .
        git commit -m "chore: preparar despliegue en Vercel"
        print_success "Cambios commiteados"
    fi
else
    print_success "No hay cambios pendientes"
fi

# 12. Verificar que está en main/master
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    print_warning "No estás en la rama main/master"
    print_info "   Rama actual: $CURRENT_BRANCH"
else
    print_success "Estás en la rama $CURRENT_BRANCH"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
print_success "✨ PREPARACIÓN COMPLETA"
echo ""
print_info "PRÓXIMOS PASOS:"
echo ""
echo "1. Crear base de datos en Neon:"
echo "   https://console.neon.tech/"
echo ""
echo "2. Copiar DATABASE_URL de Neon"
echo ""
echo "3. Configurar variables de entorno en Vercel:"
echo "   - DATABASE_URL"
echo "   - NEXT_PUBLIC_APP_URL"
echo "   - JWT_SECRET (generar: openssl rand -base64 32)"
echo "   - EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASSWORD"
echo ""
echo "4. Hacer push a GitHub:"
echo "   git push origin $CURRENT_BRANCH"
echo ""
echo "5. Vercel desplegará automáticamente"
echo ""
echo "6. Verificar:"
echo "   https://tu-dominio.vercel.app"
echo "   Login: enyeralexander@gmail.com / 0995697717"
echo ""
print_info "Para más detalles, consulta: GUIA_DESPLIEGUE_VERCEL.md"
echo ""
echo "═══════════════════════════════════════════════════════════════"
echo ""
