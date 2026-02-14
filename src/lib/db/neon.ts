/**
 * Cliente Neon (Postgres serverless). Única conexión a BD.
 */
import { neon, NeonQueryFunction } from "@neondatabase/serverless";

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    const url = process.env.DATABASE_URL;
    if (!url) throw new Error("DATABASE_URL no está definida en las variables de entorno");
    sqlInstance = neon(url);
  }
  return sqlInstance;
}
