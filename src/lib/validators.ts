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
});

export const ticketPurchaseSchema = z.object({
  items: z.array(z.union([z.string(), z.number()])).min(1).max(200).transform((arr) => arr.map(String))
});

