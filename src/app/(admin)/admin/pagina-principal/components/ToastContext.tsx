"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type ToastType = "success" | "error" | "warning";

export type ToastItem = {
  id: string;
  type: ToastType;
  message: string;
  createdAt: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 4500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    const item: ToastItem = { id, type, message, createdAt: Date.now() };
    setToasts((prev) => [...prev, item]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastList />
    </ToastContext.Provider>
  );
}

function ToastList() {
  const context = useContext(ToastContext);
  if (!context) return null;
  const { toasts, removeToast } = context;
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      style={{
        position: "fixed",
        top: "1rem",
        right: "1rem",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        maxWidth: "min(400px, calc(100vw - 2rem))",
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          style={{
            padding: "0.875rem 1rem",
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            background:
              t.type === "success"
                ? "var(--color-success-bg, #ecfdf5)"
                : t.type === "error"
                  ? "var(--color-error-bg, #fef2f2)"
                  : "var(--color-warning-bg, #fffbeb)",
            color:
              t.type === "success"
                ? "var(--color-success, #047857)"
                : t.type === "error"
                  ? "var(--color-error, #b91c1c)"
                  : "var(--color-warning, #b45309)",
            borderLeft: `4px solid ${
              t.type === "success"
                ? "#10b981"
                : t.type === "error"
                  ? "#ef4444"
                  : "#f59e0b"
            }`,
            fontSize: "0.9375rem",
            fontWeight: 500,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "0.75rem",
          }}
        >
          <span style={{ flex: 1 }}>{t.message}</span>
          <button
            type="button"
            onClick={() => removeToast(t.id)}
            aria-label="Cerrar"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "0.25rem",
              fontSize: "1.25rem",
              lineHeight: 1,
              opacity: 0.8,
            }}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx.addToast;
}
