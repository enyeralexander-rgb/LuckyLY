"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearStoredAuth, getStoredAuth } from "../lib/clientAuth";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import Image from "next/image";

export function NavBar() {
  const router = useRouter();
  const { theme, resolvedTheme } = useTheme();
  const [auth, setAuth] = useState<any>(null);
  const [userData, setUserData] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storedAuth = getStoredAuth();
    setAuth(storedAuth);
    
    // Cargar datos del usuario si está autenticado
    if (storedAuth?.token) {
      fetch("/api/user/profile", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
        .then((r) => r.json())
        .then((data) => {
          if (!data.error) {
            setUserData(data);
            // Actualizar auth con username actualizado
            if (data.username) {
              setAuth({ ...storedAuth, user: { ...storedAuth.user, username: data.username } });
            }
          }
        })
        .catch(() => {});
    }
  }, []);

  // Escuchar cambios en el username desde otras páginas
  useEffect(() => {
    const handleStorageChange = () => {
      const storedAuth = getStoredAuth();
      if (storedAuth?.token) {
        fetch("/api/user/profile", { headers: { Authorization: `Bearer ${storedAuth.token}` } })
          .then((r) => r.json())
          .then((data) => {
            if (!data.error) {
              setUserData(data);
              setAuth({ ...storedAuth, user: { ...storedAuth.user, username: data.username } });
            }
          })
          .catch(() => {});
      }
    };

    window.addEventListener("storage", handleStorageChange);
    // También escuchar eventos personalizados
    window.addEventListener("usernameUpdated", handleStorageChange);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("usernameUpdated", handleStorageChange);
    };
  }, []);

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    } finally {
      clearStoredAuth();
      setAuth(null);
      // Forzar recarga para limpiar cualquier estado en caché
      window.location.href = "/auth/login";
    }
  }

  // Determine logo source based on theme
  const logoSrc = mounted && (theme === 'dark' || resolvedTheme === 'dark')
    ? "/images/LuckyLy-Logo-BLANCO-SIN-FONDO.png"
    : "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png";

  return (
    <header className="w-full bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 transition-colors z-50 relative">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          
          {/* Logo Section */}
          <div className="flex-shrink-0 cursor-pointer" onClick={() => router.push("/")}>
            <div className="relative h-10 w-32 md:w-40">
              {mounted && (
                <Image 
                  src={logoSrc}
                  alt="LuckyLY Logo"
                  fill
                  className="object-contain object-left"
                  priority
                />
              )}
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6 absolute left-1/2 transform -translate-x-1/2">
            <Link href="/" className="text-brand-dark dark:text-brand-light font-medium uppercase hover:text-brand transition-colors">Inicio</Link>
            <Link href="/live" className="text-brand-dark dark:text-brand-light font-medium uppercase hover:text-brand transition-colors">En Vivo</Link>
            <Link href="/results" className="text-brand-dark dark:text-brand-light font-medium uppercase hover:text-brand transition-colors">Resultados</Link>
          </nav>

          {/* User Actions Section */}
          <div className="flex items-center gap-3">
            {!mounted ? (
               // Placeholder to prevent hydration mismatch layout shift
               <div className="w-24 h-10"></div>
            ) : !auth ? (
              <>
                <Link href="/auth/login" className="hidden sm:block text-brand-dark dark:text-brand-light font-medium uppercase hover:underline">
                  Ingresar
                </Link>
                <Link href="/auth/register" className="px-4 py-2 bg-brand text-white rounded-lg font-bold uppercase hover:bg-brand-accent transition-colors text-sm">
                  Registrarse
                </Link>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex items-center gap-2 px-3 py-2 rounded-full border border-brand-border bg-brand-bg dark:bg-gray-800 dark:border-gray-700 text-brand-dark dark:text-brand-light font-bold hover:shadow-md transition-shadow"
                >
                  <span>👤</span>
                  <span className="max-w-[100px] truncate hidden sm:inline">
                    {userData?.username || auth.user.username || auth.user.email.split("@")[0]}
                  </span>
                </button>
                
                {/* Dropdown Menu */}
                {menuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl overflow-hidden z-50">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
                      <p className="text-xs text-gray-500 dark:text-gray-400 uppercase">Bienvenido</p>
                      <p className="font-bold text-brand-dark dark:text-brand-light truncate">
                        {userData?.username || auth.user.username || auth.user.email.split("@")[0]}
                      </p>
                    </div>
                    
                    {/* Mobile Nav Links inside Dropdown */}
                    <div className="md:hidden border-b border-gray-100 dark:border-gray-700">
                      <Link href="/" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Inicio</Link>
                      <Link href="/live" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">En Vivo</Link>
                      <Link href="/results" onClick={() => setMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">Resultados</Link>
                    </div>

                    <Link href="/cuenta" className="block px-4 py-3 text-brand-dark dark:text-brand-light hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors border-b border-gray-100 dark:border-gray-700" onClick={() => setMenuOpen(false)}>
                      MI CUENTA
                    </Link>
                    <Link href="/cuenta/configuracion" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setMenuOpen(false)}>
                      ⚙️ Configuración
                    </Link>
                    <Link href="/cuenta/historial" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => setMenuOpen(false)}>
                      🎲 Historial de Apuestas
                    </Link>
                    <Link href="/cuenta/datos-bancarios" className="block px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700" onClick={() => setMenuOpen(false)}>
                      🏦 Datos Bancarios
                    </Link>
                    <button
                      onClick={logout}
                      className="block w-full px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition-colors uppercase text-sm font-bold"
                    >
                      Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
