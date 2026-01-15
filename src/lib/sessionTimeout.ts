// Sistema de timeout de sesión por inactividad (5 minutos)

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutos en milisegundos

let inactivityTimer: NodeJS.Timeout | null = null;
let isInitialized = false;

export function initSessionTimeout() {
  if (isInitialized || typeof window === "undefined") return;
  isInitialized = true;

  function resetTimer() {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }

    inactivityTimer = setTimeout(() => {
      // Cerrar sesión después de 5 minutos de inactividad
      const auth = localStorage.getItem("auth");
      if (auth) {
        // Limpiar sesión
        localStorage.removeItem("auth");
        // Redirigir a login
        window.location.href = "/auth/login?timeout=true";
      }
    }, INACTIVITY_TIMEOUT);
  }

  // Eventos que indican actividad del usuario
  const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart", "click"];

  events.forEach((event) => {
    document.addEventListener(event, resetTimer, true);
  });

  // Iniciar el timer
  resetTimer();
}

export function clearSessionTimeout() {
  if (inactivityTimer) {
    clearTimeout(inactivityTimer);
    inactivityTimer = null;
  }
}
