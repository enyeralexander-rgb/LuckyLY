import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: "4rem", paddingBottom: "4rem", minHeight: "60vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center" }}>
      <h1 style={{ fontSize: "4rem", margin: 0, color: "var(--text-primary)", fontWeight: 700 }}>404</h1>
      <p style={{ fontSize: "1.25rem", color: "var(--text-secondary)", margin: "1rem 0 1.5rem" }}>
        Página no encontrada
      </p>
      <p style={{ color: "var(--text-tertiary)", marginBottom: "2rem", maxWidth: "400px" }}>
        El enlace que seguiste no existe o ha sido movido.
      </p>
      <Link
        href="/"
        style={{
          display: "inline-block",
          padding: "0.75rem 1.5rem",
          background: "var(--button-primary)",
          color: "var(--button-text)",
          borderRadius: "10px",
          fontWeight: 700,
          textDecoration: "none",
        }}
      >
        Volver al inicio
      </Link>
    </main>
  );
}
