# LuckyLY – Plataforma de Sorteos

Plataforma de sorteos en línea con panel administrativo, contabilidad integrada (ingresos, egresos, ganancias), gestión de premios y reportes por período.

---

## Descripción

**LuckyLY** (WEB.SORTEOS) es una aplicación web que permite:

- **Usuarios:** registrarse, participar en sorteos, comprar cupos (tickets), gestionar perfil y datos bancarios, reclamar premios.
- **Administración:** crear y ejecutar sorteos, aprobar pagos móviles, pagar premios a ganadores, ver estadísticas y listas de pagos, exportar reportes (PDF, Excel).

La contabilidad se centraliza en un único modelo: **INGRESOS** (pagos de usuarios), **EGRESOS** (premios pagados) y **GANANCIAS** (restante). Los montos de premios se definen al crear el sorteo (regla 70/30) y se reflejan en el módulo Pagar Premios.

---

## Tecnologías

| Área | Stack |
|------|--------|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Base de datos | PostgreSQL |
| ORM | Prisma |
| Estilos | Tailwind CSS |
| Autenticación | JWT (jose) + sesión en cliente |
| Validación | Zod |
| Email | Nodemailer |
| PDF | jsPDF + jspdf-autotable |
| Exportación | ExcelJS |
| Gráficos | Recharts |
| 2FA | otplib |

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (admin)/admin/          # Panel admin (sorteos, pagos, estadísticas, usuarios, etc.)
│   ├── (user)/                 # Área de usuarios (dashboard, cuenta, historial)
│   ├── api/                    # API Routes (auth, raffles, admin, claims, etc.)
│   └── auth/                   # Páginas de login/registro
├── components/                 # Componentes reutilizables y UI
├── lib/
│   ├── accounting.ts           # Contabilidad: getContabilidadGlobal (ingresos/egresos/ganancias)
│   ├── auth.ts                 # Autenticación y roles
│   ├── prisma.ts               # Cliente Prisma
│   └── validators.ts           # Schemas Zod
└── ...
prisma/
├── schema.prisma               # Modelos: User, Raffle, Ticket, PrizeClaim, etc.
└── seed.ts
```

---

## Requisitos

- **Node.js** 18+
- **PostgreSQL** 13+ (o servicio compatible: Neon, Supabase, etc.)
- Cuenta SMTP opcional (verificación de email, recuperación de contraseña)

---

## Configuración inicial

```bash
# Clonar e instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env.local
# Editar .env.local con DATABASE_URL, JWT_SECRET, etc.

# Generar cliente Prisma y aplicar esquema
npm run prisma:generate
npm run db:setup
```

El script `db:setup` aplica el schema a la base de datos y, si están definidas `MASTER_INITIAL_EMAIL` y `MASTER_INITIAL_PASSWORD` en `.env.local`, crea el primer usuario MASTER.

---

## Variables de entorno

Copia `.env.example` a `.env.local` y rellena los valores.

### Obligatorias

| Variable | Descripción |
|----------|-------------|
| `DATABASE_URL` | URL de conexión PostgreSQL (ej. `postgresql://user:pass@host:5432/dbname`) |
| `JWT_SECRET` | Secreto para JWT (mín. 32 caracteres). Ej: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Opcionales

| Variable | Descripción |
|----------|-------------|
| `BLOB_READ_WRITE_TOKEN` | Token Vercel Blob (subida de imágenes del carrusel) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | Envío de emails (verificación, recuperación de contraseña) |
| `NEXT_PUBLIC_APP_URL` | URL base de la app (emails, enlaces) |
| `MASTER_INITIAL_EMAIL`, `MASTER_INITIAL_PASSWORD` | Crear primer MASTER al ejecutar `db:setup` |
| `MASTER_INITIAL_NAME`, `MASTER_INITIAL_DOCUMENT_ID` | Datos del MASTER inicial |
| `MASTER_SETUP_SECRET` | Secreto para el endpoint de creación de MASTER en producción |

---

## Comandos

### Desarrollo

```bash
npm run dev              # Servidor de desarrollo (puerto 3000)
npm run dev:clean        # Limpiar caché y reiniciar
npm run verify:types     # Verificar tipos TypeScript
npm run verify           # Limpiar, build y verificar
```

### Base de datos

```bash
npm run prisma:generate  # Generar cliente Prisma
npm run prisma:push      # Aplicar cambios del schema
npm run prisma:seed      # Ejecutar seed (ver documentación del seed)
npm run db:setup        # prisma generate + db push + apply-schema-postgres
npm run db:verify       # Verificar conexión a la BD
```

### Producción

```bash
npm run build   # Build de Next.js
npm start       # Servidor de producción
```

### Utilidades

```bash
npm run clean        # Limpiar caché básico
npm run clean:deep   # Limpiar caché profundo
npm run fix:webpack  # Limpiar caché de webpack si hay errores raros
npm run stop         # Detener procesos next dev
```

---

## Modelo contable

Toda la contabilidad se calcula en `src/lib/accounting.ts`:

- **INGRESOS:** Suma de `Ticket.totalPaid` con `status: "CONFIRMED"` (filtro opcional por `purchasedAt`). Origen: compras de cupos; el “Precio por cupo (Bs.)” se define en **CREAR SORTEO**.
- **EGRESOS:** Suma de `PrizeClaim.paidAmount` con `status: "PAID"` (filtro opcional por `processedAt`). Los montos son los definidos en **CREAR SORTEO** (Premios Bs.) y pagados en **PAGAR PREMIOS**.
- **GANANCIAS:** `INGRESOS − EGRESOS` (restante; regla 70% premios / 30% empresa).

El módulo **Estadísticas** (`/admin/estadisticas`) y los reportes PDF usan `getContabilidadGlobal()` para mostrar totales por período. La **Lista de Pagos** muestra las compras confirmadas (tickets) en el mismo rango de fechas que los ingresos.

---

## Roles

| Rol | Permisos principales |
|-----|------------------------|
| **USER** | Participar en sorteos, comprar cupos, perfil, historial, referidos |
| **AGENT** | Lo de USER + gestión de referidos, vistas básicas de admin |
| **CONTABLE** | Lista de pagos, estadísticas, pagar premios, reportes |
| **SUPERADMIN** | Sorteos, usuarios, estadísticas, configuración |
| **MASTER** | Control total, roles de administradores, configuración crítica |

---

## Módulos principales del admin

- **Dashboard** (`/admin`): resumen, enlaces a sorteos, pagos, estadísticas, etc.
- **Crear Sorteos** (`/admin/sorteos/crear`): precio por cupo, cantidad de ganadores (1–3), premios (Bs.) con regla 70%.
- **Pagar Premios** (`/admin/pagos`): reclamos de ganadores; el monto a pagar es el definido en CREAR SORTEO (Premios Bs.).
- **Estadísticas** (`/admin/estadisticas`): Estado de Cuenta (ingresos, egresos, ganancias, crecimiento 48 h), gráfico, lista de pagos por período, referencias, top usuarios (MASTER).
- **Usuarios** (`/admin/usuarios`): listado, búsqueda, edición.
- **Sorteos** (crear, modificar, ejecutar, cupos): flujo completo de sorteos.

---

## API (resumen)

- **Auth:** registro, login, logout, verificación de email, recuperación de contraseña.
- **Sorteos:** `GET/POST /api/raffles`, `GET/POST /api/raffles/[id]/buy`, ejecución.
- **Admin:** dashboard, users, claims (pagos de premios), estadísticas (ingresos, PDF), payments (lista de pagos).
- **Contabilidad:** los totales se obtienen vía `getContabilidadGlobal()` en las rutas de estadísticas y PDF.

---

## Despliegue (Vercel)

- **Build command:** `prisma generate && node scripts/apply-schema-postgres.js && npm run build && npm run postbuild`
- **Install command:** `npm install`
- Configurar en Vercel: `DATABASE_URL`, `JWT_SECRET`, y las variables opcionales que uses (email, MASTER inicial, Blob, etc.).

---

## Seguridad

- No subir `.env` ni `.env.local` al repositorio.
- Contraseñas hasheadas con bcrypt.
- JWT para sesión; validación de roles en API y rutas.
- Validación de entradas con Zod.
- Logs de auditoría para acciones administrativas.

---

## Licencia y soporte

Proyecto privado. Para soporte o consultas, contactar al equipo de desarrollo o revisar la documentación interna.

---

*Desarrollado por el equipo de LuckyLY*
