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

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/reset-password?token=${resetToken}`;
  
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
  const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/auth/verify-email?token=${verificationToken}`;
  
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
        <h1>Verifica tu Email</h1>
        <p>Gracias por registrarte en LuckyLY.</p>
        <p>Para completar tu registro, por favor verifica tu dirección de correo electrónico haciendo clic en el siguiente botón:</p>
        <a href="${verificationUrl}" class="button">Verificar Email</a>
        <p>O copia y pega este enlace en tu navegador:</p>
        <p style="word-break: break-all;">${verificationUrl}</p>
        <p><strong>Este enlace expirará en 24 horas.</strong></p>
        <p>Si no creaste esta cuenta, ignora este mensaje.</p>
        <div class="footer">
          <p>© ${new Date().getFullYear()} LuckyLY. Todos los derechos reservados.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail(email, "Verifica tu Email - LuckyLY", html);
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
  const updateUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/cuenta/datos-bancarios`;
  
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
