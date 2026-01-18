"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

interface UseThemeReturn {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

/**
 * Hook global para manejar el tema de la aplicación (modo claro/oscuro)
 * 
 * Uso:
 * ```tsx
 * const { theme, isDark, toggleTheme, setTheme } = useTheme();
 * ```
 * 
 * Funcionalidades:
 * - Lee la preferencia del usuario desde localStorage
 * - Aplica el tema al body con el atributo data-theme
 * - Detecta preferencia del sistema si no hay preferencia guardada
 * - Persiste la preferencia en localStorage
 */
export function useTheme(): UseThemeReturn {
  const [theme, setThemeState] = useState<Theme>("light");
  const [mounted, setMounted] = useState(false);

  // Inicializar tema al montar el componente
  useEffect(() => {
    setMounted(true);
    
    // Leer preferencia guardada o detectar preferencia del sistema
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    
    const initialTheme: Theme = savedTheme || (systemPrefersDark ? "dark" : "light");
    
    setThemeState(initialTheme);
    applyTheme(initialTheme);
  }, []);

  // Aplicar tema al DOM
  const applyTheme = (newTheme: Theme) => {
    if (typeof document !== "undefined") {
      document.body.setAttribute("data-theme", newTheme);
      
      // También actualizar el color-scheme para inputs nativos
      document.documentElement.style.colorScheme = newTheme;
    }
  };

  // Cambiar tema
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem("theme", newTheme);
    applyTheme(newTheme);
  };

  // Alternar tema
  const toggleTheme = () => {
    const newTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
  };

  // Evitar flash de tema incorrecto en SSR
  if (!mounted) {
    return {
      theme: "light",
      isDark: false,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }

  return {
    theme,
    isDark: theme === "dark",
    toggleTheme,
    setTheme,
  };
}

export default useTheme;
