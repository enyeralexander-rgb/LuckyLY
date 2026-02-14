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
- **En cada deploy**, el comando `npm run build` en Vercel ejecuta primero `db:push` con la `DATABASE_URL` configurada en las variables de entorno del proyecto. Así el esquema se aplica o actualiza automáticamente y las credenciales de login (usuarios en la BD) funcionan desde el primer despliegue.
- Si en un deploy no hay `DATABASE_URL` (por ejemplo en un preview sin BD), el paso de base de datos se omite y el build continúa.

  **Opcional – aplicar el esquema manualmente** (sin tocar archivos del proyecto):

  ```bash
  DATABASE_URL="postgresql://usuario:contraseña@host/prod_db?sslmode=require" npm run db:push
  ```

  **Alternativa:** En Neon → SQL Editor, pega y ejecuta el contenido de `schema/00-initial.sql` en la base de producción.

### 4. Deploy

Haz push a la rama conectada o despliega desde el dashboard. Vercel ejecutará `npm run build` (db:push + next build) y desplegará.

### 5. Post-despliegue: crear el primer usuario MASTER

En Vercel debes tener definidas al menos **`MASTER_SETUP_SECRET`** y, si quieres que el API use credenciales desde el servidor, **`MASTER_INITIAL_EMAIL`** y **`MASTER_INITIAL_PASSWORD`**.

**Opción A – Llamar al API (recomendado)**  
Una sola petición crea el MASTER usando las variables de entorno:

1. En Vercel → Project → Settings → Environment Variables, añade:
   - `MASTER_SETUP_SECRET`: un secreto largo y aleatorio (solo para esta acción).
   - `MASTER_INITIAL_EMAIL`: email del primer administrador.
   - `MASTER_INITIAL_PASSWORD`: contraseña del primer administrador.
   - Opcionales: `MASTER_INITIAL_NAME`, `MASTER_INITIAL_DOCUMENT_ID`.

2. Redeploy si acabas de añadir variables (para que estén disponibles en runtime).

3. Llama al endpoint con el secreto (el email y la contraseña se leen de las variables anteriores):

   ```bash
   curl -X POST "https://tu-app.vercel.app/api/setup/create-master" \
     -H "Content-Type: application/json" \
     -d '{"secret":"EL_VALOR_DE_MASTER_SETUP_SECRET"}'
   ```

   O envía todo en el body (el secret puede ir también en el header `x-master-setup-secret`):

   ```bash
   curl -X POST "https://tu-app.vercel.app/api/setup/create-master" \
     -H "Content-Type: application/json" \
     -d '{"secret":"TU_SECRET","email":"admin@tudominio.com","password":"tu_contraseña_segura"}'
   ```

   Si la respuesta es 400 con "Faltan email y/o contraseña", comprueba que `MASTER_INITIAL_EMAIL` y `MASTER_INITIAL_PASSWORD` estén definidas en Vercel para el entorno correcto (Production/Preview) y que hayas hecho redeploy.

**Opción B – Script desde tu máquina contra la BD de producción**  
Sin tocar archivos del proyecto, pasando la URL y las credenciales solo en la terminal:

```bash
DATABASE_URL="postgresql://..." \
MASTER_INITIAL_EMAIL="admin@tudominio.com" \
MASTER_INITIAL_PASSWORD="tu_contraseña" \
npx tsx scripts/create-master-vercel.ts
```

Sustituye `DATABASE_URL` por la de producción (la misma que en Vercel). El script crea o actualiza el usuario MASTER en esa base.

**Opción C – SQL generado e inyectado (sin variables de entorno en el servidor)**  
Generas un archivo SQL con el usuario MASTER y lo aplicas contra la base de producción. El archivo `initial-master.sql` está en `.gitignore` y no se sube al repo.

1. Generar el SQL (solo una vez, desde tu máquina):

   ```bash
   MASTER_EMAIL="admin@tudominio.com" MASTER_PASSWORD="tu_contraseña" npm run db:generate-initial-master
   ```

   Se crea `initial-master.sql` en la raíz del proyecto. Opcionales: `MASTER_NAME`, `MASTER_DOCUMENT_ID`.

2. Inyectar en la base de producción (sin escribir la URL en ningún archivo):

   ```bash
   DATABASE_URL="postgresql://usuario:contraseña@host/neondb?sslmode=require" npm run db:apply-initial-master
   ```

   O con `psql` si lo tienes instalado: `psql "$DATABASE_URL" -f initial-master.sql`

4. Entra en `https://tu-app.vercel.app/auth/login` con ese email y contraseña y comprueba el panel en `/admin`.

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
| `npm run db:generate-initial-master` | Genera `initial-master.sql` con el usuario MASTER (MASTER_EMAIL, MASTER_PASSWORD en env) |
| `npm run db:apply-initial-master` | Aplica `initial-master.sql` a la BD (DATABASE_URL en env) |
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
