# Chat en vivo con Pusher

El chat en vivo usa **Pusher** para que funcione en Vercel (sin servidor persistente).

## 1. Crear cuenta y app en Pusher

1. Entra en [pusher.com](https://pusher.com) y crea una cuenta.
2. En el dashboard: **Channels** → **Create app**.
3. Elige nombre, cluster (ej. **us2** o **eu**) y el stack (por ejemplo **React**).
4. En **App Keys** copia:
   - **app_id**
   - **key**
   - **secret**
   - **cluster**

## 2. Variables de entorno

En **local** añade a `.env.local`:

```env
# Pusher (chat en vivo)
PUSHER_APP_ID=tu_app_id
PUSHER_KEY=tu_key
PUSHER_SECRET=tu_secret
PUSHER_CLUSTER=us2

# Las mismas key y cluster en público para el cliente
NEXT_PUBLIC_PUSHER_KEY=tu_key
NEXT_PUBLIC_PUSHER_CLUSTER=us2
```

En **Vercel**: en el proyecto → Settings → Environment Variables, añade las mismas variables (y marca `NEXT_PUBLIC_*` para Production/Preview si quieres que el chat funcione en todos los entornos).

## 3. Probar en local

```bash
npm run dev
```

Abre la página del live (donde está el chat). Si ves "Chat en vivo" y el punto verde, está conectado. Envía un mensaje y ábrelo en otra pestaña para ver que llega en tiempo real.

## 4. Desplegar en Vercel

Haz deploy como siempre. El chat usará Pusher; no hace falta configurar nada más en Vercel.

## Límites del plan gratuito de Pusher

- 200k mensajes/día
- 100 conexiones simultáneas
- Suficiente para desarrollo y tráfico bajo. Para más, revisa los planes en pusher.com.

## Comprobar variables

```bash
npm run check-env
```

Las variables de Pusher son opcionales; si faltan, el chat mostrará "Chat no configurado" y el input estará deshabilitado.
