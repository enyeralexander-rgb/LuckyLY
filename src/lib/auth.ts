import jwt from "jsonwebtoken";
import { Role } from "@prisma/client";

// Helper to get secret lazily
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("CRITICAL: JWT_SECRET environment variable is not defined.");
  }
  return secret;
}

export type AuthContext = {
  userId: string;
  role: Role;
};

export class AuthError extends Error {
  status: number;
  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export function parseBearer(authHeader?: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

function parseCookie(cookieHeader?: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [k, ...rest] = c.trim().split("=");
      return [k, rest.join("=")];
    }),
  );
}

export function getTokenFromRequest(request: Request): string | null {
  const bearer = parseBearer(request.headers.get("authorization"));
  if (bearer) return bearer;
  const cookies = parseCookie(request.headers.get("cookie"));
  return cookies["auth_token"] ?? null;
}

export function requireAuth(
  request: Request,
  allowedRoles?: Role[],
): AuthContext {
  const token = getTokenFromRequest(request);
  if (!token) {
    throw new AuthError("No autenticado", 401);
  }
  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(token, secret) as jwt.JwtPayload;
    
    if (!payload.sub || !payload.role) throw new AuthError("Token inválido", 401);
    
    const role = payload.role as Role;
    
    if (allowedRoles && !allowedRoles.includes(role)) {
      throw new AuthError("Sin permisos", 403);
    }
    return { userId: payload.sub as string, role: role };
  } catch (err) {
    if (err instanceof AuthError) throw err;
    throw new AuthError("Token inválido", 401);
  }
}
