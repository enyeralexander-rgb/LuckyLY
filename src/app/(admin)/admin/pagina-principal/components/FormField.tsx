"use client";

import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  id?: string;
};

export function FormField({ label, hint, error, children, id }: FormFieldProps) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          marginBottom: "0.5rem",
          color: "var(--text-primary)",
          fontWeight: 600,
        }}
      >
        {label}
      </label>
      {children}
      {hint && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--text-secondary)",
          }}
        >
          {hint}
        </div>
      )}
      {error && (
        <div
          style={{
            marginTop: "0.5rem",
            fontSize: "0.875rem",
            color: "var(--color-error, #ef4444)",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
