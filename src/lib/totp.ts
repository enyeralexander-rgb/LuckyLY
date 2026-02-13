/**
 * Wrapper para otplib v13 — centraliza la lógica TOTP para 2FA.
 *
 * otplib v13 eliminó el objeto `authenticator` y ahora exporta
 * funciones de nivel superior. Este módulo re-expone la API
 * que necesitan las rutas 2FA del proyecto.
 */
import { TOTP, generateSecret as otpGenerateSecret, generateURI, verifySync } from "otplib";

/** Genera un secreto aleatorio base32 para TOTP. */
export function generateSecret(): string {
  return otpGenerateSecret();
}

/** Genera la URI otpauth:// para el QR code. */
export function keyuri(account: string, service: string, secret: string): string {
  return generateURI({
    strategy: "totp",
    label: account,
    issuer: service,
    secret,
  });
}

/** Verifica un token TOTP contra un secreto. */
export function verify(options: { token: string; secret: string }): boolean {
  const result = verifySync({ token: options.token, secret: options.secret });
  return result.valid;
}
