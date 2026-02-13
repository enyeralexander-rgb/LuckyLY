# 🎰 LuckyLY - Plataforma de Sorteos

## 📋 Descripción

LuckyLY es una plataforma completa de sorteos en línea desarrollada con Next.js 14, que permite a los usuarios participar en sorteos, comprar tickets y gestionar sus cuentas. Incluye un panel administrativo completo para la gestión de sorteos, usuarios y operaciones.

## 🚀 Tecnologías Utilizadas

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL con Prisma ORM
- **Estilos**: Tailwind CSS
- **Autenticación**: NextAuth.js + JWT
- **WebSockets**: Socket.io para notificaciones en tiempo real
- **UI Components**: React con componentes personalizados
- **Validación**: Zod
- **Email**: Nodemailer
- **2FA**: OTP con otplib
- **Exportación**: ExcelJS y jsPDF

## 🏗️ Arquitectura del Proyecto

```
src/
├── app/                    # Páginas y rutas (App Router)
│   ├── (admin)/           # Rutas protegidas para administradores
│   ├── (user)/            # Rutas protegidas para usuarios
│   ├── api/               # API Routes
│   ├── auth/              # Páginas de autenticación
│   └── globals.css        # Estilos globales
├── components/            # Componentes reutilizables
├── hooks/                 # Custom hooks
├── lib/                   # Utilidades y configuraciones
└── types/                 # Definiciones de tipos
```

## 🔄 Flujo de Trabajo del Proyecto

### 1. **Configuración Inicial**

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno (nunca commitear .env ni credenciales)
cp .env.example .env.local

# Generar cliente de Prisma
npm run prisma:generate

# Aplicar esquema a la base de datos
npm run db:setup
```

### 2. **Desarrollo Local**

```bash
# Iniciar servidor de desarrollo
npm run dev

# Limpiar caché y reiniciar (si hay problemas)
npm run dev:clean

# Verificar tipos TypeScript
npm run verify:types

# Verificar build completo
npm run verify
```

### 3. **Gestión de Base de Datos**

```bash
# Generar cliente Prisma
npm run prisma:generate

# Aplicar cambios al esquema
npm run prisma:push

# Ejecutar seed (solo limpieza: borra datos, no crea usuarios)
npm run prisma:seed

# Verificar conexión a BD
npm run db:verify
```

**Desde cero (reset total):** Para dejar la BD vacía y crear el primer MASTER por variables de entorno, ver `docs/PLAN_LIMPIAR_DATOS_DESDE_CERO.md` (flujo completo). Resumen: usar `npx prisma db push --force-reset --accept-data-loss` o ejecutar `scripts/reset-database.sql`, luego `node scripts/apply-schema-postgres.js` (crea MASTER si existen `MASTER_INITIAL_EMAIL` y `MASTER_INITIAL_PASSWORD` en `.env`). `scripts/clean-database.sql` es solo **limpieza operativa** (mantiene admins).

**Contenido generado:** La carpeta `public/uploads/payment-proofs/` almacena comprobantes de pago subidos en runtime; no se versiona (está en `.gitignore`). En un reset manual del servidor puedes vaciarla si quieres eliminar también esos archivos.

### 4. **Flujo de Trabajo con Git**

```bash
# Crear rama para nueva funcionalidad
git checkout -b feature/nueva-funcionalidad

# Commits siguiendo conventional commits
git commit -m "feat: agregar nueva funcionalidad"

# Push a rama
git push origin feature/nueva-funcionalidad

# Crear Pull Request en GitHub
# Después del merge, eliminar rama
git branch -d feature/nueva-funcionalidad
```

### 5. **Despliegue en Producción**

#### **Vercel (Recomendado)**

```bash
# Build command (configurado en vercel.json)
prisma generate && node scripts/apply-schema-postgres.js && npm run build && npm run postbuild
```

El script `apply-schema-postgres.js` aplica el schema y **solo crea el usuario MASTER** si en Vercel están definidas `MASTER_INITIAL_EMAIL` y `MASTER_INITIAL_PASSWORD`. Si no las configuras, la BD quedará sin usuarios (puedes crear el primero luego con el endpoint de setup o en un deploy posterior con esas variables).

**Variables de entorno en Vercel:**
- Requeridas: `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `EMAIL_SERVER` (o equivalente).
- Opcionales (primer MASTER): `MASTER_INITIAL_EMAIL`, `MASTER_INITIAL_PASSWORD`; opcionales: `MASTER_INITIAL_NAME`, `MASTER_INITIAL_DOCUMENT_ID`, `MASTER_SETUP_SECRET`.

#### **Build Local**

```bash
# Build para producción
npm run build

# Iniciar servidor de producción
npm start
```

## 👥 Roles de Usuario

### **Usuario Regular (USER)**
- Participar en sorteos
- Comprar tickets
- Gestionar cuenta personal
- Ver historial de jugadas

### **Agente (AGENT)**
- Todas las funciones de usuario
- Gestionar usuarios referidos
- Ver estadísticas básicas

### **Contable (CONTABLE)**
- Gestionar pagos y transacciones
- Ver reportes financieros

### **Super Administrador (SUPERADMIN)**
- Gestionar sorteos
- Gestionar usuarios
- Ver estadísticas avanzadas
- Configurar reglas del sistema

### **Master (MASTER)**
- Control total del sistema
- Gestionar roles de administradores
- Configuraciones críticas

## 🎯 Funcionalidades Principales

### **Para Usuarios**
- ✅ Registro y autenticación con email
- ✅ Verificación de email obligatoria
- ✅ Compra de tickets para sorteos
- ✅ Sistema de referidos
- ✅ Historial de jugadas
- ✅ Notificaciones en tiempo real
- ✅ Perfil personal y configuración
- ✅ 2FA opcional

### **Para Administradores**
- ✅ Panel de control completo
- ✅ Gestión de sorteos (crear, modificar, ejecutar)
- ✅ Gestión de usuarios y roles
- ✅ Estadísticas y reportes
- ✅ Sistema de logs de auditoría
- ✅ Configuración de homepage
- ✅ Gestión de pagos móviles
- ✅ Exportación de datos

### **Sistema de Sorteos**
- ✅ Múltiples tipos de sorteos (números, animales, estados, banderas, signos zodiacales)
- ✅ Compra de tickets individuales o múltiples
- ✅ Sistema de cupos y límites
- ✅ Ejecución automática de sorteos
- ✅ Sistema de premios y ganadores
- ✅ Resultados en tiempo real

## 🔐 Seguridad

- **Credenciales**: No commitear `.env` ni archivos con contraseñas o datos sensibles. Los scripts de schema y setup **no incluyen credenciales por defecto**; el primer MASTER se configura con variables de entorno (`MASTER_INITIAL_EMAIL`, `MASTER_INITIAL_PASSWORD`) o mediante el endpoint protegido `/api/setup/create-master`. Usar siempre `.env.example` como plantilla sin valores reales.
- **Autenticación**: JWT + NextAuth.js
- **Autorización**: Middleware de roles
- **Validación**: Zod schemas en todas las APIs
- **Rate Limiting**: Protección contra abuso
- **Auditoría**: Logs completos de todas las acciones
- **2FA**: Autenticación de dos factores opcional
- **Encriptación**: Contraseñas hasheadas con bcrypt

## 📊 API Endpoints

### **Autenticación**
- `POST /api/auth/register` - Registro de usuario
- `POST /api/auth/login` - Inicio de sesión
- `POST /api/auth/logout` - Cerrar sesión
- `POST /api/auth/verify-email` - Verificar email

### **Usuarios**
- `GET /api/user/profile` - Obtener perfil
- `PUT /api/user/profile` - Actualizar perfil
- `GET /api/user/raffles` - Sorteos del usuario
- `GET /api/user/payments` - Historial de pagos

### **Sorteos**
- `GET /api/raffles` - Listar sorteos activos
- `GET /api/raffles/[id]` - Detalles de sorteo
- `POST /api/raffles/[id]/tickets` - Comprar tickets
- `GET /api/public/results` - Resultados públicos

### **Administración**
- `GET /api/admin/dashboard` - Dashboard admin
- `GET /api/admin/users` - Gestión de usuarios
- `POST /api/admin/raffles` - Crear sorteo
- `PUT /api/admin/raffles/[id]` - Modificar sorteo

## 🧪 Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run build            # Build de producción
npm run start            # Servidor de producción

# Base de datos
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:push      # Aplicar cambios al esquema
npm run prisma:seed      # Ejecutar seed
npm run db:setup         # Configuración completa de BD

# Limpieza y verificación
npm run clean            # Limpiar caché básico
npm run clean:deep       # Limpieza profunda
npm run verify           # Verificar build completo
npm run verify:types     # Verificar tipos TypeScript

# Utilidades
npm run fix:webpack      # Solucionar problemas de webpack
npm run stop             # Detener procesos de desarrollo
```

## 🌐 Variables de Entorno

### **Requeridas**
```env
DATABASE_URL=postgresql://username:password@host:port/database
NEXTAUTH_SECRET=tu_secreto_jwt_aqui
NEXTAUTH_URL=https://tu-dominio.com
EMAIL_SERVER=smtp://usuario:password@smtp.gmail.com:587
```

### **Opcionales**
```env
NODE_ENV=development
NEXT_PUBLIC_APP_URL=https://tu-dominio.com
ENABLE_2FA=true
RATE_LIMIT_ENABLED=true
```

## 🚀 Despliegue

### **Requisitos Previos**
- Node.js 18+
- PostgreSQL 13+
- Cuenta en Vercel (recomendado)

### **Pasos para Despliegue**
1. **Configurar base de datos**: Crear instancia PostgreSQL
2. **Variables de entorno**: Configurar en Vercel
3. **Build**: Vercel ejecuta automáticamente el build command
4. **Migraciones**: Se ejecutan automáticamente en cada despliegue

### **Configuración de Vercel**
- **Framework Preset**: Next.js
- **Root Directory**: ./
- **Build Command**: `prisma generate && node scripts/apply-schema-postgres.js && npm run build && npm run postbuild`
- **Install Command**: `npm install`

## 📈 Monitoreo y Logs

### **Sistema de Logs**
- **Auditoría**: Todas las acciones administrativas se registran
- **Errores**: Logs de errores en consola y archivos
- **Rendimiento**: Métricas de respuesta de APIs
- **Usuario**: Logs de acciones de usuarios

### **Dashboard Administrativo**
- Estadísticas en tiempo real
- Métricas de uso
- Reportes de ingresos
- Gestión de usuarios activos

## 🐛 Solución de Problemas

### **Problemas Comunes**

#### **Error de Build en Vercel**
```bash
# Limpiar caché y reconstruir
npm run clean:deep
npm run build
```

#### **Problemas con Prisma**
```bash
# Regenerar cliente
npm run prisma:generate

# Verificar conexión
npm run db:verify
```

#### **Errores de Webpack**
```bash
# Limpiar caché de webpack
npm run fix:webpack
```

#### **Problemas de Tipos TypeScript**
```bash
# Verificar tipos
npm run verify:types
```

## 🤝 Contribución

### **Proceso de Contribución**
1. Crear issue describiendo la funcionalidad
2. Crear rama desde `development`
3. Implementar cambios siguiendo el estilo del código
4. Crear tests si es necesario
5. Hacer commit siguiendo conventional commits
6. Crear Pull Request
7. Esperar revisión y aprobación

### **Estándares de Código**
- **TypeScript**: Tipado estricto en todas las funciones
- **ESLint**: Seguir reglas configuradas
- **Prettier**: Formateo automático
- **Conventional Commits**: Commits descriptivos

## 📝 Licencia

Este proyecto es privado y propiedad de LuckyLY.

## 📞 Soporte

Para soporte técnico o consultas:
- Crear issue en el repositorio
- Contactar al equipo de desarrollo
- Revisar la documentación interna

---

**Desarrollado con ❤️ por el equipo de LuckyLY**