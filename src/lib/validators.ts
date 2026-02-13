import { z } from "zod";

// Validación de contraseña: mínimo 8 caracteres, al menos 1 número, al menos 1 carácter especial
const passwordSchema = z.string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/\d/, "La contraseña debe contener al menos 1 número")
  .regex(/[@$!%*?&.]/, "La contraseña debe contener al menos 1 carácter especial (@$!%*?&.)");

// Validación de username: mínimo 5 caracteres, solo alfanuméricos
const usernameSchema = z.string()
  .min(5, "El nombre de usuario debe tener al menos 5 caracteres")
  .regex(/^[a-zA-Z0-9]+$/, "El nombre de usuario solo puede contener letras y números (sin espacios ni símbolos)");

// Validación de documentId: formato V-12345678 o E-12345678
const documentIdSchema = z.string()
  .regex(/^[VE]-\d+$/, "El ID debe tener el formato V-12345678 o E-12345678");

export const registerSchema = z.object({
  name: z.string().min(3),
  username: usernameSchema,
  documentId: documentIdSchema,
  email: z.string().email("Formato de correo inválido"),
  password: passwordSchema,
  acceptTerms: z.boolean().refine((val) => val === true, "Debes aceptar los términos y condiciones"),
  referralCode: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email("Formato de correo inválido"),
  password: z.string().min(1, "La contraseña es requerida")
});

/** Extrae el valor numérico de un premio (acepta "700", "700.00", "Bs. 700.00", etc.) */
export function parsePrizeValue(p: string): number {
  if (typeof p !== "string") return 0;
  const match = p.trim().match(/(\d+(?:[.,]\d+)?)/);
  if (!match) return parseFloat(p) || 0;
  return parseFloat(match[1].replace(",", ".")) || 0;
}

export const raffleCreateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  type: z.enum(["NUMBERS", "ANIMALS", "STATES", "FLAGS", "ZODIAC"]),
  pricePerSlot: z.coerce.number().positive(),
  slots: z.number().int().positive(),
  winnersCount: z.number().int().min(1).max(3),
  mirrorMode: z.boolean().optional(),
  startsAt: z.coerce.date().nullable().optional(),
  closesAt: z.coerce.date().nullable().optional(),
  prizes: z.array(z.string()).min(1)
}).refine((data) => {
  // Regla de Orden: Premios de mayor a menor
  const values = data.prizes.map((p) => parsePrizeValue(p));
  for (let i = 0; i < values.length - 1; i++) {
    if (values[i] < values[i + 1]) {
      return false;
    }
  }
  return true;
}, {
  message: "Los premios deben estar ordenados de mayor a menor (1° >= 2° >= 3°...)",
  path: ["prizes"]
}).refine((data) => {
  // Regla del 70%: El total de premios debe ser EXÁCTAMENTE el 70% del ingreso total
  const totalIncome = data.slots * data.pricePerSlot;
  const requiredPrizePool = totalIncome * 0.70;
  const currentPrizePool = data.prizes.reduce((acc, curr) => acc + parsePrizeValue(curr), 0);
  return Math.abs(currentPrizePool - requiredPrizePool) < 0.1;
}, {
  message: "El valor total de los premios debe ser exactamente el 70% del valor total del sorteo (Cupos * Precio)",
  path: ["prizes"]
});

export const ticketPurchaseSchema = z.object({
  items: z.array(z.union([z.string(), z.number()])).min(1).max(200).transform((arr) => arr.map(String)),
  paymentMethod: z.enum(["MOBILE", "OTHER"]).optional().nullable(),
  paymentMobileRef: z.string().optional().nullable(),
  paymentMobileBank: z.string().optional().nullable()
});

/** Body para marcar un reclamo como pagado (admin) */
export const claimPaySchema = z.object({
  paymentRef: z.string().min(1, "Referencia de pago requerida"),
  paidAmount: z.coerce.number().positive("El monto pagado debe ser un número positivo")
});

/** Body para actualizar datos bancarios del perfil de usuario */
export const profileUpdateSchema = z.object({
  bank: z.string().min(1, "El banco es obligatorio"),
  phoneNumber: z.string().min(11, "El teléfono debe tener al menos 11 caracteres")
});

