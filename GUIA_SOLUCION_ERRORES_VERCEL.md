# Guía de Solución de Errores en Vercel

## Error P3005: Base de datos no vacía (Baseline requerido)

### Problema
El error `P3005` indica que Prisma está intentando aplicar migraciones a una base de datos que ya tiene un esquema, pero Prisma no tiene registro de qué migraciones ya se aplicaron.

### Solución Automática

El archivo `vercel.json` está configurado para usar un script inteligente que maneja este caso:

```json
{
  "buildCommand": "prisma generate && node scripts/vercel-migrate.js && npm run build && npm run postbuild"
}
```

El script `scripts/vercel-migrate.js`:
1. Intenta `prisma migrate deploy` primero
2. Si falla con P3005, usa `prisma db push` para sincronizar el esquema
3. No falla el build, solo sincroniza el esquema

### Solución Manual (si la automática falla)

Si necesitas hacer baseline manualmente:

```bash
# 1. Marcar todas las migraciones como aplicadas
npx prisma migrate resolve --applied [nombre-migracion]

# 2. O usar db push para sincronizar
npx prisma db push
```

## Error 401: Credenciales inválidas (Usuario MASTER no existe)

### Problema
Después de desplegar en Vercel, al intentar hacer login con las credenciales del administrador MASTER (`enyeralexander@gmail.com` / `0995697717`), se recibe un error 401 (Unauthorized). Esto ocurre porque el usuario MASTER no existe en la base de datos de Vercel.

### Solución Automática (Implementada)

El script `scripts/vercel-migrate.js` ahora crea automáticamente el usuario MASTER después de sincronizar el esquema de la base de datos durante cada despliegue. Esto significa que:

1. **No necesitas hacer nada manualmente**
2. El usuario MASTER se crea/actualiza automáticamente en cada deploy
3. Las credenciales son siempre las mismas:
   - **Email**: `enyeralexander@gmail.com`
   - **Password**: `0995697717`

### Solución Manual (Si la automática falla)

#### Opción 1: Usar el endpoint API

1. **En desarrollo/preview**: Simplemente visita la URL:
   ```
   https://tu-proyecto.vercel.app/api/setup/create-master
   ```

2. **En producción**: Agrega una clave secreta en las variables de entorno de Vercel:
   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
   - Agrega: `MASTER_SETUP_SECRET` = `[una clave secreta de tu elección]`
   - Luego visita: `https://tu-proyecto.vercel.app/api/setup/create-master?secret=[TU_CLAVE_SECRETA]`

#### Opción 2: Ejecutar script localmente

Si tienes acceso a la base de datos desde tu máquina local:

```bash
# Configurar DATABASE_URL
export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"

# Ejecutar script
npx tsx scripts/create-master-vercel.ts
```

### Verificación

Después del despliegue, espera unos segundos y luego intenta hacer login con:
- **Email**: `enyeralexander@gmail.com`
- **Password**: `0995697717`

---

## Error P2022: Columna no encontrada en la base de datos

### Problema
El error `P2022` indica que Prisma está intentando acceder a una columna que no existe en la base de datos. Esto ocurre cuando el esquema de la base de datos no está sincronizado con el schema de Prisma.

### Solución Inmediata (Aplicar Manualmente)

Si el error P2022 persiste después del build, aplica la migración manualmente:

```bash
# Opción 1: Usando el script
export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
bash scripts/apply-migration-vercel.sh

# Opción 2: Directamente con psql
export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
psql "$DATABASE_URL" -f database/migrations/production/20260116160000_remove_birthdate_add_documentid.sql

# Opción 3: Usando Prisma db push (sincroniza todo el esquema)
export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
npx prisma db push --accept-data-loss
```

### Verificación

Después de aplicar la migración, verifica:

```sql
-- Verificar que documentId existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'documentId';

-- Verificar que birthDate no existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'birthDate';
```

### Solución Automática

El script `vercel-migrate.js` intenta usar `prisma db push` para sincronizar el esquema automáticamente, pero si falla, debes aplicar la migración manualmente.

#### Opción 2: Aplicar migraciones manualmente

Si las migraciones automáticas fallan, puedes aplicar las migraciones manualmente:

1. **Conectarse a la base de datos de Vercel:**
   - Ve a Vercel Dashboard → Tu Proyecto → Settings → Environment Variables
   - Copia el valor de `DATABASE_URL`

2. **Aplicar migraciones localmente:**
   ```bash
   export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
   npx prisma migrate deploy
   ```

3. **O aplicar el schema completo:**
   ```bash
   export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
   psql "$DATABASE_URL" -f database/SCHEMA_COMPLETO_DEVELOPMENT.sql
   ```

#### Opción 3: Aplicar migración específica de documentId

Si solo necesitas aplicar la migración de `documentId`, ejecuta:

```bash
export DATABASE_URL="[TU_DATABASE_URL_DE_VERCEL]"
psql "$DATABASE_URL" -f prisma/migrations/20260116160000_remove_birthdate_add_documentid/migration.sql
```

### Verificación

Después de aplicar las migraciones, verifica que las columnas existan:

```sql
-- Verificar que documentId existe
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'documentId';

-- Verificar que birthDate no existe
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'User' AND column_name = 'birthDate';
```

## Warning de SSL Mode

### Problema
El warning sobre SSL modes (`prefer`, `require`, `verify-ca`) indica que estos modos serán tratados como `verify-full` en futuras versiones.

### Solución

El código en `src/lib/prisma.ts` ahora normaliza automáticamente la URL de conexión para usar `sslmode=verify-full` explícitamente. Esto elimina el warning.

Si necesitas usar un modo diferente, puedes modificar la variable de entorno `DATABASE_URL` en Vercel:

- Para comportamiento actual (más seguro): `sslmode=verify-full`
- Para compatibilidad libpq: `uselibpqcompat=true&sslmode=require`

## Pasos Recomendados para Desplegar

1. **Asegúrate de que todas las migraciones estén en el repositorio:**
   ```bash
   git add prisma/migrations/
   git commit -m "Add migrations"
   git push
   ```

2. **Vercel ejecutará automáticamente:**
   - `prisma generate` - Genera el cliente de Prisma
   - `prisma migrate deploy` - Aplica las migraciones pendientes
   - `npm run build` - Compila el proyecto
   - `npm run postbuild` - Ejecuta scripts post-build

3. **Si hay errores, verifica:**
   - Que `DATABASE_URL` esté configurada en Vercel
   - Que la base de datos tenga permisos para crear/modificar tablas
   - Que todas las migraciones estén en `prisma/migrations/`

## Migraciones Pendientes

Las siguientes migraciones deben estar aplicadas:

- ✅ `20260116160000_remove_birthdate_add_documentid` - Agrega `documentId` y elimina `birthDate`
- ✅ `20260115000000_add_incorrect_data_status` - Agrega estado `INCORRECT_DATA` a `PrizeStatus`

Si alguna de estas migraciones no está aplicada, el proyecto fallará con error P2022.
