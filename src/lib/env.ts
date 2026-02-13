import { z } from "zod";
import { logger } from "./logger";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  // Add other required env vars here
  // NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
});

export function validateEnv() {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error("Invalid environment variables", { fieldErrors: parsed.error.flatten().fieldErrors });
    throw new Error("Invalid environment variables");
  }

  return parsed.data;
}

export const env = validateEnv();
