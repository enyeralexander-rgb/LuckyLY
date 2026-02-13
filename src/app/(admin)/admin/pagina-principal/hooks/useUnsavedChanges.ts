"use client";

import { useEffect } from "react";

/**
 * Muestra confirmación al cerrar pestaña o recargar cuando hay cambios sin guardar.
 * @param isDirty - true si hay cambios sin guardar
 */
export function useUnsavedChanges(isDirty: boolean) {
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);
}
