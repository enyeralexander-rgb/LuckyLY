# Diagnóstico de Errores en Vercel

## Problema: "Error interno del servidor"

Si el proyecto está desplegado pero muestra "Error interno del servidor", sigue estos pasos para diagnosticar:

## 1. Verificar Variables de Entorno en Vercel

Asegúrate de que todas las variables de entorno estén configuradas en Vercel:

1. Ve a tu proyecto en Vercel Dashboard
2. Settings → Environment Variables
3. Verifica que existan:
   - `DATABASE_URL` - URL de conexión a PostgreSQL (Neon, Supabase, Railway, etc.)
   - `JWT_SECRET` - Clave secreta para JWT (debe ser una cadena aleatoria segura)
   - `NEXT_PUBLIC_APP_URL` - URL de tu aplicación (ej: `https://tu-proyecto.vercel.app`)

### Ejemplo de valores:
```
DATABASE_URL=postgresql://user:password@host:5432/database?sslmode=require
JWT_SECRET=tu-clave-secreta-muy-segura-aqui
NEXT_PUBLIC_APP_URL=https://tu-proyecto.vercel.app
```

## 2. Verificar Endpoint de Salud

He agregado un endpoint de diagnóstico. Accede a:
```
https://tu-proyecto.vercel.app/api/health
```

Este endpoint te mostrará:
- Estado de la conexión a la base de datos
- Variables de entorno configuradas
- Información del entorno

### Respuesta esperada (éxito):
```json
{
  "status": "ok",
  "timestamp": "2026-01-15T...",
  "database": "connected",
  "environment": "production",
  "variables": {
    "hasDatabaseUrl": true,
    "hasJwtSecret": true,
    "hasNextPublicAppUrl": true
  }
}
```

### Respuesta de error:
```json
{
  "status": "error",
  "database": "disconnected",
  "error": "Error de conexión..."
}
```

## 3. Verificar Logs en Vercel

1. Ve a tu proyecto en Vercel Dashboard
2. Deployments → Selecciona el último deployment
3. Verifica los logs para ver errores específicos

### Errores comunes:

#### Error: "Can't reach database server"
- **Causa**: `DATABASE_URL` incorrecta o base de datos no accesible
- **Solución**: Verifica la URL de conexión en tu proveedor de base de datos

#### Error: "Prisma Client not initialized"
- **Causa**: Prisma Client no se generó durante el build
- **Solución**: Ya está resuelto con `postinstall` script y `buildCommand` en `vercel.json`

#### Error: "JWT_SECRET is not defined"
- **Causa**: Variable de entorno faltante
- **Solución**: Agrega `JWT_SECRET` en Vercel Environment Variables

## 4. Verificar Esquema de Base de Datos

Si la base de datos está vacía o no tiene el esquema aplicado:

### Opción A: Usar Prisma Migrate (Recomendado)
```bash
# Desde tu máquina local
npx prisma migrate deploy
```

### Opción B: Usar Prisma DB Push (Desarrollo)
```bash
# Desde tu máquina local
npx prisma db push
```

**Nota**: Asegúrate de que `DATABASE_URL` en tu `.env` local apunte a la misma base de datos que en Vercel.

## 5. Verificar Conexión a Base de Datos

### Probar conexión desde terminal local:
```bash
# Conectar usando psql (si tienes PostgreSQL instalado)
psql "tu-database-url-aqui"

# O usar Prisma Studio
npx prisma studio
```

## 6. Verificar Build en Vercel

1. Ve a Deployments → Último deployment
2. Verifica que el build haya completado exitosamente
3. Busca errores en la sección "Build Logs"

### Si el build falla:
- Verifica que `package.json` y `package-lock.json` estén sincronizados
- Verifica que todas las dependencias estén en `dependencies` (no solo en `devDependencies`)
- Verifica que `postinstall` script esté configurado

## 7. Probar Endpoints Específicos

### Endpoint público (no requiere autenticación):
```
GET https://tu-proyecto.vercel.app/api/public/homepage
```

### Endpoint de salud:
```
GET https://tu-proyecto.vercel.app/api/health
```

### Endpoint de login (requiere POST con email y password):
```
POST https://tu-proyecto.vercel.app/api/auth/login
```

## 8. Soluciones Rápidas

### Si el problema es la base de datos:
1. Verifica que `DATABASE_URL` esté correcta en Vercel
2. Verifica que la base de datos esté accesible desde internet
3. Verifica que el esquema esté aplicado (`npx prisma migrate deploy`)

### Si el problema es Prisma Client:
1. Ya está resuelto con `postinstall` script
2. Si persiste, verifica que `prisma generate` se ejecute en el build

### Si el problema es variables de entorno:
1. Agrega todas las variables necesarias en Vercel
2. Haz un redeploy después de agregar variables

## 9. Contactar Soporte

Si después de seguir estos pasos el problema persiste:

1. Copia los logs completos de Vercel
2. Copia la respuesta del endpoint `/api/health`
3. Verifica qué endpoint específico está fallando
4. Comparte esta información para diagnóstico adicional

## Checklist Final

- [ ] Variables de entorno configuradas en Vercel
- [ ] Base de datos accesible y esquema aplicado
- [ ] Build completado exitosamente
- [ ] Endpoint `/api/health` responde correctamente
- [ ] Logs de Vercel no muestran errores críticos
- [ ] Prisma Client generado correctamente (verificado en build logs)
