export type StoredAuth = {
  token: string;
  user: { id: string; email: string; role: string };
};

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function getStoredAuth(): StoredAuth | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  const userRaw = localStorage.getItem(USER_KEY);
  if (!token || !userRaw) return null;
  try {
    const user = JSON.parse(userRaw) as StoredAuth["user"];
    return { token, user };
  } catch {
    return null;
  }
}

export function setStoredAuth(auth: StoredAuth) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, auth.token);
  localStorage.setItem(USER_KEY, JSON.stringify(auth.user));
}

export function clearStoredAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

