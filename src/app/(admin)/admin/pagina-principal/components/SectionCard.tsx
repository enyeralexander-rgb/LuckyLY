"use client";

import { useState, type ReactNode } from "react";

const STORAGE_PREFIX = "pagina-principal-section-";

type SectionCardProps = {
  title: string;
  children: ReactNode;
  /** Si es true, la sección se puede colapsar */
  collapsible?: boolean;
  /** Clave para persistir estado abierto/cerrado en localStorage (ej. "carousel") */
  storageKey?: string;
};

function getStoredOpen(key: string): boolean {
  if (typeof window === "undefined") return true;
  try {
    const v = localStorage.getItem(STORAGE_PREFIX + key);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

function setStoredOpen(key: string, open: boolean) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, open ? "1" : "0");
  } catch {
    // ignore
  }
}

export function SectionCard({
  title,
  children,
  collapsible = false,
  storageKey,
}: SectionCardProps) {
  const storageKeyResolved = storageKey ?? title.replace(/\s+/g, "-").toLowerCase();
  const [open, setOpenState] = useState(() =>
    typeof window !== "undefined" && collapsible ? getStoredOpen(storageKeyResolved) : true
  );

  function toggleOpen() {
    const next = !open;
    setOpenState(next);
    if (storageKeyResolved) setStoredOpen(storageKeyResolved, next);
  }

  return (
    <div
      className="card"
      style={{
        padding: "2rem",
        marginBottom: "1.5rem",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: open ? "1.5rem" : 0,
          gap: "0.5rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            color: "var(--text-primary)",
            fontSize: "1.25rem",
          }}
        >
          {title}
        </h2>
        {collapsible && (
          <button
            type="button"
            onClick={toggleOpen}
            aria-expanded={open}
            aria-controls={`section-${storageKeyResolved}`}
            aria-label={open ? "Ocultar sección" : "Mostrar sección"}
            id={`section-toggle-${storageKeyResolved}`}
            style={{
              padding: "0.35rem 0.75rem",
              background: "var(--bg-accent, #f3f4f6)",
              border: "1px solid var(--border-color)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            {open ? "▲ Ocultar" : "▼ Mostrar"}
          </button>
        )}
      </div>
      {open && (
        <div id={`section-${storageKeyResolved}`} role="region" aria-labelledby={`section-toggle-${storageKeyResolved}`}>
          {children}
        </div>
      )}
    </div>
  );
}
