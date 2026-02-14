# Migraciones SQL (cambios posteriores al esquema)

**No modificar** `../00-initial.sql`. Ese archivo es solo para el **primer despliegue** en una base vacía.

Para cambios, nuevas funciones o actualizaciones del esquema **sin borrar datos**:

1. Crear un nuevo archivo numerado: `001_descripcion_corta.sql`, `002_otro_cambio.sql`, etc.
2. Escribir solo las sentencias **incrementales** (ALTER TABLE, CREATE INDEX, nuevos tipos, etc.).
3. Aplicar en orden contra la base de datos (Neon SQL Editor o `psql` / script propio).

Ejemplo `001_agregar_campo_ejemplo.sql`:

```sql
-- Migración: agregar campo ejemplo a User (sin borrar datos)
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ejemplo" TEXT;
```

Reglas:

- Usar `IF NOT EXISTS` / `IF EXISTS` cuando sea posible para que la migración sea idempotente.
- No usar `DROP TABLE` ni `TRUNCATE` salvo que sea intencional y documentado.
- Probar primero en una copia o rama de la base de datos.
