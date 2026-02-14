/**
 * Cierre de sesión automático por inactividad (5 minutos).
 * Limpia localStorage (auth_token, auth_user) y cookie de sesión vía API.
 */
import { clearStoredAuth, getStoredAuth } from "./clientAuth";

const INACTIVITY_MINUTES = 5;
const INACTIVITY_TIMEOUT = INACTIVITY_MINUTES * 60 * 1000;

let inactivityTimer: ReturnType<typeof setTimeout> | null = null;
let isInitialized = false;

export function initSessionTimeout() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  function logoutByInactivity() {
    if (!getStoredAuth()) return;
    clearStoredAuth();
    fetch("/api/auth/logout", { method: "POST" }).catch(() => {});
    window.location.href = "/?timeout=1";
  }

  function resetTimer() {
    if (inactivityTimer) clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(logoutByInactivity, INACTIVITY_TIMEOUT);
  }

  const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
  events.forEach((ev) => document.addEventListener(ev, resetTimer, true));
  resetTimer();
}

export function clearSessionTimeout() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}
