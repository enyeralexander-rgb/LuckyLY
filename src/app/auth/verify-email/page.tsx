"use client";
import { useEffect, useState, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function VerifyEmailPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const hasVerified = useRef(false);
  const redirectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (hasVerified.current) return;

    const token = searchParams.get("token");
    if (!token) {
      setStatus("error");
      setMessage("Token no proporcionado");
      return;
    }

    hasVerified.current = true;

    fetch(`/api/auth/verify-email?token=${token}`, {
      method: "GET",
      headers: { Accept: "application/json" },
      redirect: "manual",
      credentials: "same-origin",
      cache: "no-store",
    })
      .then(async (res) => {
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success) {
          setStatus("success");
          setMessage(
            data.alreadyVerified
              ? "Tu email ya estaba verificado. Redirigiendo..."
              : "¡Email verificado exitosamente! Redirigiendo..."
          );
          redirectTimeoutRef.current = setTimeout(async () => {
            try {
              const sessionRes = await fetch("/api/auth/verify", {
                method: "GET",
                credentials: "same-origin",
                cache: "no-store",
              });
              if (sessionRes.ok) {
                router.push("/cuenta/configuracion");
              } else {
                router.push("/auth/login?verified=true");
              }
            } catch {
              router.push("/auth/login?verified=true");
            }
          }, 1500);
        } else {
          setStatus("error");
          setMessage(data?.error || "Error al verificar email");
        }
      })
      .catch((err) => {
        console.error("Error:", err);
        setStatus("error");
        setMessage("Error de conexión al verificar email");
      });

    return () => {
      if (redirectTimeoutRef.current) {
        clearTimeout(redirectTimeoutRef.current);
        redirectTimeoutRef.current = null;
      }
    };
  }, [searchParams, router]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F5E6" }}>
      <div className="card" style={{ maxWidth: "500px", padding: "2rem", textAlign: "center" }}>
        {status === "loading" && (
          <>
            <h1 style={{ color: "#3E3E3C", marginBottom: "1rem" }}>Verificando Email...</h1>
            <p style={{ color: "#6b7280" }}>Por favor espera...</p>
          </>
        )}
        {status === "success" && (
          <>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✅</div>
            <h1 style={{ color: "#85BB65", marginBottom: "1rem" }}>Email Verificado</h1>
            <p style={{ color: "#3E3E3C", marginBottom: "2rem" }}>{message}</p>
            <Link href="/auth/login" style={{ padding: "0.75rem 1.5rem", background: "#85BB65", color: "#3E3E3C", textDecoration: "none", borderRadius: "8px", fontWeight: 600 }}>
              Ir al Login
            </Link>
          </>
        )}
        {status === "error" && (
          <>
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>❌</div>
            <h1 style={{ color: "#ef4444", marginBottom: "1rem" }}>Error</h1>
            <p style={{ color: "#3E3E3C", marginBottom: "2rem" }}>{message}</p>
            <Link href="/auth/login" style={{ padding: "0.75rem 1.5rem", background: "#85BB65", color: "#3E3E3C", textDecoration: "none", borderRadius: "8px", fontWeight: 600 }}>
              Volver al Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>Cargando...</div>}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
