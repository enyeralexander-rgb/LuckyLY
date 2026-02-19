// @ts-ignore - nodemailer puede no estar instalado
import nodemailer from "nodemailer";
import { logger } from "./logger";

// Configuración de email (usar variables de entorno en producción)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: process.env.SMTP_SECURE === "true", // true para 465, false para otros puertos
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export type EmailAttachment = { filename: string; path?: string; content?: Buffer };
export async function sendEmail(to: string, subject: string, html: string, text?: string, attachments?: EmailAttachment[]) {
  try {
    // Si no hay configuración de SMTP, solo loguear en desarrollo
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      logger.info("Email (desarrollo)", { to, subject });
      logger.debug("Contenido email (desarrollo)", { hasText: !!text, hasHtml: !!html });
      return { success: true, messageId: "dev-mode" };
    }

    const mailOptions: any = {
      from: `"LuckyLY" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ""),
      html,
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map((a) => (a.content != null ? { filename: a.filename, content: a.content } : { filename: a.filename, path: a.path }));
    }

    const info = await transporter.sendMail(mailOptions);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error("Error enviando email", { error: error instanceof Error ? error.message : String(error) });
    return { success: false, error: String(error) };
  }
}

// Asegura que la URL base tenga protocolo (para enlaces en emails/PDFs)
function normalizeBaseUrl(url: string): string {
  const u = url.trim();
  if (!u) return "http://localhost:3000";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  return u.startsWith("localhost") ? `http://${u}` : `https://${u}`;
}

// Función helper para obtener la URL base de la aplicación
function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL);
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${getAppUrl()}/auth/reset-password?token=${resetToken}`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #85BB65; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Recuperación de Contraseña</h1>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
        <a href="${resetUrl}" class="button">Restablecer Contraseña</a>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all;">${resetUrl}</p>
        <p><strong>Este enlace expirará en 1 hora.</strong></p>
        <p>Si no solicitaste este cambio, ignora este mensaje.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Recuperación de Contraseña - LuckyLY", html);
}

export async function sendPrizePaymentEmail(
  email: string,
  userName: string,
  raffleTitle: string,
  bodyTemplate: string | null,
  proofBuffer?: Buffer,
  proofFilename?: string
) {
  const defaultBody = `¡Felicidades, ${userName}! 🌟
Ganaste en LuckyLY. Te envío adjunto el comprobante de pago de tu premio.
¡Gracias por confiar en nosotros, por ser parte de nuestra comunidad y a disfrutarlo! 🥳
Sorteo: ${raffleTitle}`;
  const bodyText = (bodyTemplate || defaultBody)
    .replace(/\{\{userName\}\}/g, userName)
    .replace(/\{\{raffleTitle\}\}/g, raffleTitle);
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <pre style="white-space: pre-wrap; font-family: inherit;">${bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments: EmailAttachment[] = [];
  if (proofBuffer && proofBuffer.length > 0) {
    const ext = proofFilename?.match(/\.(jpg|jpeg|png|gif|webp)$/i)?.[1] || "jpg";
    attachments.push({ filename: `comprobante-pago.${ext}`, content: proofBuffer });
  }

  return sendEmail(email, "Comprobante de Pago - LuckyLY", html, undefined, attachments.length ? attachments : undefined);
}

export async function sendIncorrectBankDataEmail(email: string, userName: string, raffleTitle: string) {
  const updateUrl = `${getAppUrl()}/cuenta/datos-bancarios`;
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .button { display: inline-block; padding: 12px 24px; background-color: #85BB65; color: #fff; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Hola, ${userName}:</h1>
        <p>Nos complace informarte que has resultado ganador en nuestro reciente sorteo. ¡Felicidades! 🥳</p>
        <p>Sin embargo, te notificamos que nuestro sistema intentó realizar la transferencia de tu premio, pero la transacción no pudo completarse debido a que los datos bancarios registrados parecen ser incorrectos o no son válidos.</p>
        <p>Para proceder con el pago, por favor ingresa a tu perfil y actualiza tu información bancaria lo antes posible.</p>
        <div style="text-align: center;">
          <a href="${updateUrl}" class="button">Actualizar Datos Bancarios</a>
        </div>
        <p>Una vez corregida la información, procesaremos el pago nuevamente para que pueda disfrutar de su premio.</p>
        <p>Gracias por jugar en LuckyLY. ❤️</p>
        <p><strong>Sorteo:</strong> ${raffleTitle}</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Actualización de Datos Bancarios Requerida - LuckyLY", html);
}

export async function sendTicketApprovalEmail(
  email: string,
  userName: string,
  raffleTitle: string,
  items: { value: string }[],
  customBody: string | null
) {
  const itemsList = items.map((i) => i.value).join(", ");
  const defaultBody = `Hola ${userName},\n\nTe informamos que tu compra ha sido aprobada exitosamente.\n\nSorteo: ${raffleTitle}\nCupos confirmados: ${itemsList}\n\n¡Buena suerte! 🍀`;

  const bodyText = customBody
    ? customBody
        .replace(/\{\{userName\}\}/g, userName)
        .replace(/\{\{raffleTitle\}\}/g, raffleTitle)
        .replace(/\{\{items\}\}/g, itemsList)
    : defaultBody;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .footer { margin-top: 30px; font-size: 12px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <pre style="white-space: pre-wrap; font-family: inherit;">${bodyText.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</pre>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Compra Aprobada - LuckyLY", html);
}
