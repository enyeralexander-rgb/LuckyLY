import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(3),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, "El nombre de usuario solo puede contener letras, números y guiones bajos"),
  birthDate: z.coerce.date().refine((date) => {
    const today = new Date();
    const age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }, "Debes ser mayor de 18 años para registrarte"),
  email: z.string().email(),
  password: z.string().min(6),
  acceptTerms: z.boolean().refine((val) => val === true, "Debes aceptar los términos y condiciones"),
  referralCode: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
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
  prizes: z.array(z.string()).min(1)
});

export const ticketPurchaseSchema = z.object({
  items: z.array(z.union([z.string(), z.number()])).min(1).max(200).transform((arr) => arr.map(String))
});

