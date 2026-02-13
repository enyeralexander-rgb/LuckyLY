// @ts-ignore - nodemailer puede no estar instalado
import nodemailer from "nodemailer";
import { join } from "path";

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

export async function sendEmail(to: string, subject: string, html: string, text?: string, attachments?: Array<{ filename: string; path: string }>) {
  try {
    // Si no hay configuración de SMTP, solo loguear en desarrollo
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("📧 Email (desarrollo):", { to, subject });
      console.log("📧 Contenido:", text || html);
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
      mailOptions.attachments = attachments;
    }

    const info = await transporter.sendMail(mailOptions);

    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error enviando email:", error);
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

export async function sendEmailVerificationEmail(email: string, verificationToken: string) {
  const verificationUrl = `${getAppUrl()}/auth/verify-email?token=${verificationToken}`;
  const appUrl = getAppUrl();
  
  // Plantilla mejorada para evitar filtros de spam
  const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
      <title>Verificación de Correo - LuckyLY</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background-color: #f4f4f4;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f4f4f4;">
        <tr>
          <td align="center" style="padding: 40px 20px;">
            <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="padding: 30px 40px; text-align: center; background-color: #228D57; border-radius: 8px 8px 0 0;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">LuckyLY</h1>
                  <p style="margin: 10px 0 0; color: #d0fdd7; font-size: 14px;">Sorteos en línea</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px; color: #333333; font-size: 22px;">Confirma tu dirección de correo</h2>
                  <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                    Hola,
                  </p>
                  <p style="margin: 0 0 20px; color: #555555; font-size: 16px; line-height: 1.6;">
                    Para completar tu registro en LuckyLY y comenzar a participar en nuestros sorteos, 
                    necesitamos verificar que esta dirección de correo electrónico te pertenece.
                  </p>
                  <p style="margin: 0 0 30px; color: #555555; font-size: 16px; line-height: 1.6;">
                    Haz clic en el siguiente botón para verificar tu cuenta:
                  </p>
                  <!-- Button -->
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                    <tr>
                      <td align="center">
                        <a href="${verificationUrl}" style="display: inline-block; padding: 14px 32px; background-color: #85BB65; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: bold;">
                          Verificar mi correo
                        </a>
                      </td>
                    </tr>
                  </table>
                  <p style="margin: 30px 0 10px; color: #777777; font-size: 14px; line-height: 1.5;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:
                  </p>
                  <p style="margin: 0 0 20px; color: #228D57; font-size: 13px; word-break: break-all;">
                    ${verificationUrl}
                  </p>
                  <p style="margin: 20px 0 0; padding: 15px; background-color: #fff3cd; border-radius: 4px; color: #856404; font-size: 14px;">
                    <strong>Nota:</strong> Este enlace expirará en 24 horas por seguridad.
                  </p>
                  <p style="margin: 20px 0 0; color: #999999; font-size: 13px;">
                    Si no creaste una cuenta en LuckyLY, puedes ignorar este mensaje de forma segura.
                  </p>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 20px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; text-align: center;">
                  <p style="margin: 0 0 10px; color: #666666; font-size: 12px;">
                    Este correo fue enviado desde ${appUrl}
                  </p>
                  <p style="margin: 0; color: #999999; font-size: 12px;">
                    © ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const text = `
Confirma tu dirección de correo - LuckyLY

Hola,

Para completar tu registro en LuckyLY y comenzar a participar en nuestros sorteos, 
necesitamos verificar que esta dirección de correo electrónico te pertenece.

Haz clic en el siguiente enlace para verificar tu cuenta:
${verificationUrl}

Nota: Este enlace expirará en 24 horas por seguridad.

Si no creaste una cuenta en LuckyLY, puedes ignorar este mensaje de forma segura.

© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.
  `;

  return sendEmail(email, "Confirma tu correo electrónico - LuckyLY", html, text);
}

export async function sendPrizePaymentEmail(email: string, userName: string, raffleTitle: string, proofPath?: string) {
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
        <h1>¡Felicidades, ${userName}! 🌟</h1>
        <p>Ganaste en LuckyLY. Te envío adjunto el comprobante de pago de tu premio.</p>
        <p>¡Gracias por confiar en nosotros, por ser parte de nuestra comunidad y a disfrutarlo! 🥳</p>
        <p><strong>Sorteo:</strong> ${raffleTitle}</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments = proofPath ? [{ filename: "comprobante-pago.jpg", path: join(process.cwd(), "public", proofPath) }] : undefined;

  return sendEmail(email, "Comprobante de Pago - LuckyLY", html, undefined, attachments);
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
