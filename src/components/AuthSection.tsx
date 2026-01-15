"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { getStoredAuth } from "../lib/clientAuth";

export function AuthSection() {
  const [auth, setAuth] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setAuth(getStoredAuth());
  }, []);

  // Evitar problemas de hidratación: no renderizar hasta que se monte en el cliente
  if (!mounted) {
    return null;
  }

  // Solo mostrar si el usuario no está logueado
  if (auth) {
    return null;
  }

  return (
    <section className="container" style={{ padding: "3rem 0" }}>
      <div className="card" style={{ padding: "3rem", textAlign: "center", background: "linear-gradient(135deg, #228D57 0%, #1a6b42 100%)", border: "2px solid #85BB65" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "2rem", color: "#ffffff" }}>
          ¿Listo para participar?
        </h2>
        <p style={{ margin: "0 0 2rem", fontSize: "1.125rem", color: "#e2e8f0", maxWidth: "600px", marginLeft: "auto", marginRight: "auto" }}>
          Regístrate ahora y comienza a participar en nuestros sorteos. Compra cupos, mira la ruleta en vivo y gana premios increíbles.
        </p>
        <div style={{ display: "flex", gap: "1rem", justifyContent: "center", flexWrap: "wrap" }}>
          <Link 
            href="/auth/login"
            style={{
              padding: "1rem 2rem",
              background: "#85BB65",
              color: "#ffffff",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "1.125rem",
              textDecoration: "none",
              display: "inline-block",
              transition: "all 0.2s"
            }}
          >
            Ingresar
          </Link>
          <Link 
            href="/auth/register"
            style={{
              padding: "1rem 2rem",
              background: "transparent",
              color: "#85BB65",
              border: "2px solid #85BB65",
              borderRadius: "10px",
              fontWeight: 700,
              fontSize: "1.125rem",
              textDecoration: "none",
              display: "inline-block",
              transition: "all 0.2s"
            }}
          >
            Registrarse
          </Link>
        </div>
      </div>
    </section>
  );
}

