# Imágenes del Proyecto

## Imagen de Portada (Hero)

**Archivo requerido:** `ruleta-fortuna-hero.jpg`

Esta imagen se utiliza como fondo de la sección Hero (portada) de la página principal.

**Especificaciones:**
- Nombre del archivo: `ruleta-fortuna-hero.jpg`
- Ubicación: `/public/images/ruleta-fortuna-hero.jpg`
- Formato recomendado: JPG o PNG
- Resolución recomendada: 1920x800px o superior (mantener proporción 16:9 o similar)

**Efectos aplicados:**
- Desenfoque gaussiano: 10px (10%)
- Opacidad: 80%

Por favor, agrega la imagen de la ruleta de la fortuna en esta ubicación con el nombre especificado.

## Iconos para el correo de aprobación de cupos

Los iconos de WhatsApp e Instagram se usan en el email que se envía al confirmar una compra (redes sociales al pie del correo).

- **whatsapp-icon.svg** / **whatsapp-icon.png** — Icono de WhatsApp (blanco sobre fondo verde en el correo).
- **instagram-icon.svg** / **instagram-icon.png** — Icono de Instagram (blanco sobre fondo rosa en el correo).

El correo carga por defecto los **.svg**. Si en algunos clientes (p. ej. Gmail, Outlook) no se ven, exporta los SVG a PNG (56×56 px, icono blanco sobre transparente), guarda como `whatsapp-icon.png` e `instagram-icon.png` aquí, y en `src/lib/email.ts` cambia las rutas de `whatsapp-icon.svg` / `instagram-icon.svg` a `whatsapp-icon.png` / `instagram-icon.png`.




