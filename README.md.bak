# 🎰 LUCKYLY V01 - Plataforma de Sorteos Online

**Versión:** 1.0.0  
**Fecha de Compilación:** Enero 2025  
**Estado:** ✅ Listo para Producción

---

## 📦 CONTENIDO DEL PAQUETE

Este paquete contiene la aplicación web LuckyLY completamente compilada y lista para instalar en un servidor.

### Archivos Incluidos:

- ✅ **Código fuente completo** (`src/`)
- ✅ **Build compilado** (`.next/`)
- ✅ **Base de datos** (Prisma schema y migraciones)
- ✅ **Archivos públicos** (`public/`)
- ✅ **Configuración** (`next.config.js`, `tsconfig.json`, `middleware.ts`)
- ✅ **Scripts** (`scripts/`)
- ✅ **Documentación completa**

---

## 📚 DOCUMENTACIÓN

### 1. INSTRUCCIONES_INSTALACION.md
Guía completa de instalación para:
- Linux (Ubuntu/Debian)
- Linux (CentOS/RHEL)
- Windows Server
- macOS Server

Incluye:
- Requisitos del sistema
- Instrucciones paso a paso
- Configuración de base de datos
- Configuración de servidor web
- Solución de problemas

### 2. CONFIGURACIONES_Y_CONEXIONES.md
Guía detallada de:
- Configuración de base de datos PostgreSQL
- Configuración de email (SMTP)
- Variables de entorno
- Configuración de seguridad
- Configuración de servidor web (Nginx/Apache)
- Verificación de configuraciones

### 3. COMPATIBILIDAD_APPS_MOVILES_DESKTOP.md
Análisis completo de:
- Compatibilidad para aplicaciones móviles (Android/iOS)
- Compatibilidad para aplicaciones de escritorio (Windows/macOS)
- Opciones de implementación
- Estimaciones de tiempo y costo
- Recomendaciones técnicas

---

## 🚀 INICIO RÁPIDO

### 1. Requisitos Previos

- Node.js 18+ (recomendado: 20.x LTS)
- PostgreSQL 14+
- NPM 9+

### 2. Instalación Básica

```bash
# 1. Copiar archivos al servidor
# 2. Instalar dependencias
npm install --production

# 3. Configurar variables de entorno
cp .env.example .env
nano .env  # Editar con tus valores

# 4. Generar Prisma Client
npx prisma generate

# 5. Ejecutar migraciones
npx prisma migrate deploy

# 6. Crear administrador inicial
npx tsx scripts/clean-test-data-and-create-master.ts

# 7. Iniciar aplicación
npm start
```

### 3. Credenciales de Administrador

**Email:** enyeralexander@gmail.com  
**Password:** 0995697717  
**Rol:** MASTER

---

## ⚙️ CONFIGURACIÓN MÍNIMA REQUERIDA

### Variables de Entorno (.env)

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/luckyly_db?schema=public"
JWT_SECRET="genera-un-secreto-seguro-de-32-caracteres-minimo"
NEXT_PUBLIC_APP_URL="https://tu-dominio.com"
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="tu-email@gmail.com"
SMTP_PASS="tu-password-de-aplicacion"
NODE_ENV="production"
```

---

## 📋 CHECKLIST DE INSTALACIÓN

- [ ] Sistema operativo compatible instalado
- [ ] Node.js y NPM instalados
- [ ] PostgreSQL instalado y configurado
- [ ] Base de datos creada
- [ ] Variables de entorno configuradas
- [ ] Dependencias instaladas (`npm install`)
- [ ] Prisma Client generado
- [ ] Migraciones ejecutadas
- [ ] Administrador inicial creado
- [ ] Aplicación compilada (`npm run build`)
- [ ] Servidor web configurado (Nginx/Apache)
- [ ] SSL/HTTPS configurado (producción)
- [ ] Firewall configurado
- [ ] Backups configurados

---

## 🔒 SEGURIDAD

**IMPORTANTE:**
- ⚠️ Cambiar `JWT_SECRET` por un valor seguro
- ⚠️ Cambiar contraseña del administrador después del primer login
- ⚠️ Usar HTTPS en producción
- ⚠️ Configurar firewall
- ⚠️ No compartir archivo `.env`

---

## 📞 SOPORTE

Para problemas de instalación:
1. Consultar `INSTRUCCIONES_INSTALACION.md`
2. Consultar `CONFIGURACIONES_Y_CONEXIONES.md`
3. Verificar logs: `pm2 logs luckyly`

---

## 📝 NOTAS

- El proyecto está compilado y listo para producción
- Todas las dependencias están especificadas en `package.json`
- Las migraciones de base de datos están en `prisma/migrations/`
- El administrador MASTER ya está creado con las credenciales especificadas
- **NUEVO:** Sistema de ganancias netas implementado (ingresos - premios pagados)
- **NUEVO:** Generación de PDF con reporte administrativo completo

---

**¡Listo para instalar y usar!** 🎉
