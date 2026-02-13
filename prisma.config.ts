import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname);
// Cargar .env y .env.local desde la raíz del proyecto
dotenv.config({ path: path.join(root, ".env") });
dotenv.config({ path: path.join(root, ".env.local") });

export default defineConfig({
  datasource: {
    url: env("DATABASE_URL"),
  },
  migrations: {
    seed: "node --loader ts-node/esm prisma/seed.ts",
  },
});
