# LuckyLY – Plataforma de Sorteos

Aplicación web de sorteos con ruleta, panel de administración, roles (USER, AGENT, CONTABLE, SUPERADMIN, MASTER), pago móvil, 2FA y notificaciones. Stack: **Next.js 14**, **PostgreSQL (Neon)**, **Vercel**.

---

## Requisitos

- **Node.js** 18+
- **npm** 9+
- Cuenta **Neon** (PostgreSQL serverless)
- Cuenta **Vercel** (despliegue)

---

## Configuración local (desarrollo)

### 1. Clonar e instalar

```bash
git clone <url-del-repo>
cd web-sorteos
npm install
```

### 2. Variables de entorno

Copia la plantilla y rellena valores:

```bash
cp .env.example .env.local
```

Edita `.env.local`. Variables **obligatorias**:

| Variable       | Descripción |
|----------------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL (Neon). Ejemplo: `postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require` |
| `JWT_SECRET`   | Secreto para firmar JWTs (mín. 32 caracteres). Generar: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

Opcionales: `BLOB_READ_WRITE_TOKEN` (Vercel Blob), `SMTP_*` (emails), `NEXT_PUBLIC_APP_URL`, `MASTER_SETUP_SECRET` (crear primer MASTER en producción). Ver `.env.example`.

### 3. Base de datos – primer despliegue del esquema

En una base **vacía** (nueva en Neon), aplica el esquema completo una sola vez:

**Opción A – desde tu máquina (recomendado para local):**

```bash
npm run db:push
```

Esto ejecuta `schema/00-initial.sql` contra la BD definida en `DATABASE_URL` (`.env.local`).

**Opción B – desde Neon Console:**

1. En Neon → tu proyecto → **SQL Editor**.
2. Copia todo el contenido de `schema/00-initial.sql`.
3. Pégalo y ejecuta.

### 4. Crear el primer usuario MASTER (opcional en local)

- Con script:  
  `MASTER_INITIAL_EMAIL=... MASTER_INITIAL_PASSWORD=... MASTER_INITIAL_NAME=... MASTER_INITIAL_DOCUMENT_ID=... npx tsx scripts/create-master-vercel.ts`
- O llamando a `POST /api/setup/create-master` con `MASTER_SETUP_SECRET` y body (email, password, documentId, name) una vez desplegado.

### 5. Arrancar en desarrollo

```bash
npm run dev
```

Abre `http://localhost:3000`. Login en `/auth/login`.

---

## Despliegue en Vercel (producción)

### 1. Conectar el repositorio

- Vercel → **Add New** → **Project** → importa el repo de Git.
- Framework: **Next.js** (detectado automáticamente).
- Build: `npm run build` (ya definido en `vercel.json`).

### 2. Variables de entorno en Vercel

En **Project → Settings → Environment Variables** añade al menos:

| Variable              | Obligatoria | Descripción |
|-----------------------|-------------|-------------|
| `DATABASE_URL`        | Sí          | URL de la base PostgreSQL de **producción** (Neon) |
| `JWT_SECRET`          | Sí          | Mismo criterio que en local; **valor distinto** en producción |
| `MASTER_SETUP_SECRET` | Sí (recom.) | Secreto para crear el primer MASTER vía `/api/setup/create-master` |
| `BLOB_READ_WRITE_TOKEN` | No        | Si usas imágenes en admin (Vercel Blob) |
| `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`, … | No | Para envío de emails |

No subas `.env` ni `.env.local` al repo; todo se configura en Vercel.

### 3. Base de datos de producción

- Crea un **nuevo proyecto** o una **nueva rama** en Neon para producción.
- Aplica el esquema **una sola vez** en esa BD:
  - Desde tu máquina: pon en `.env.local` la `DATABASE_URL` de producción y ejecuta `npm run db:push`.
  - O en Neon SQL Editor: pega y ejecuta el contenido de `schema/00-initial.sql`.

### 4. Deploy

Haz push a la rama conectada o despliega desde el dashboard. Vercel ejecutará `npm run build` y desplegará.

### 5. Post-despliegue

1. Crear el primer MASTER:
   - `POST https://tu-app.vercel.app/api/setup/create-master`  
     Body (JSON): `email`, `password`, `documentId`, `name`  
     Header o query: `MASTER_SETUP_SECRET` según cómo lo tengas configurado en el API.
2. Entrar en `/auth/login` con ese usuario y comprobar el panel admin en `/admin`.

---

## Esquema de base de datos y migraciones

- **Primer despliegue:** un solo archivo, **`schema/00-initial.sql`**, con todo el esquema (tablas, enums, índices, FKs). Se ejecuta **una vez** en una base vacía.
- **Cambios posteriores:** se hacen con archivos **incrementales** en `schema/migrations/` (por ejemplo `001_nombre_corto.sql`, `002_otro_cambio.sql`), con solo las sentencias que añaden o modifican objetos **sin borrar datos**. Ver `schema/migrations/README.md`.

---

## Sesión y cierre automático

La sesión (cookie + localStorage) se cierra **automáticamente tras 5 minutos de inactividad** (sin interacción del usuario). Al expirar se redirige a `/` con `?timeout=1`. El tiempo está definido en `src/lib/sessionTimeout.ts`.

---

## Scripts útiles

| Comando | Descripción |
|--------|-------------|
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción (tras `build`) |
| `npm run lint` | Linter |
| `npm run db:push` | Aplica `schema/00-initial.sql` a la BD de `DATABASE_URL` |
| `npm run db:verify` | Comprueba conexión a la BD |
| `npm run db:create-master` | Crea usuario MASTER (requiere env de MASTER_INITIAL_*) |

---

## Estructura relevante del proyecto

```
├── schema/
│   ├── 00-initial.sql      # Esquema completo (primer despliegue)
│   └── migrations/          # Cambios posteriores (001_xxx.sql, …)
├── src/
│   ├── app/                 # Rutas Next.js (App Router)
│   ├── components/
│   ├── lib/                 # Auth, DB, sessionTimeout, etc.
│   └── ...
├── scripts/                 # Utilidades (db-push, verify, create-master, …)
├── .env.example             # Plantilla de variables de entorno
├── vercel.json              # Configuración de build y headers en Vercel
└── README.md                # Este archivo
```

---

## Soporte

Para errores de build o despliegue, revisar:

1. Variables de entorno en Vercel y que `DATABASE_URL` apunte a la BD donde ya se aplicó `00-initial.sql`.
2. Que `JWT_SECRET` tenga al menos 32 caracteres.
3. Logs en **Vercel → Project → Deployments → [último] → Logs**.
