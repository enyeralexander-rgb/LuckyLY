import "./globals.css";
import type { Metadata } from "next";
import { Suspense } from "react";
import { Fredoka, Oswald } from "next/font/google";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { TutorialProvider } from "../contexts/TutorialContext";
import { TutorialOverlay } from "../components/TutorialOverlay";
import { Header } from "../components/ui/Header";
import { SocialFloat } from "../components/SocialFloat";

// Usar Fredoka en lugar de Cherry Bomb One (más confiable en Vercel)
const fredoka = Fredoka({ 
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-cherry-bomb",
  display: "swap",
  fallback: ["system-ui", "sans-serif"]
});

const oswald = Oswald({ 
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-oswald",
  display: "swap",
  fallback: ["system-ui", "sans-serif"]
});

export const metadata: Metadata = {
  title: "LuckyLY",
  description: "Plataforma de sorteos con ruleta, recargas y panel administrativo",
  icons: {
    icon: [
      { url: "/images/LuckyLy-Logo-BLANCO-SIN-FONDO.png", media: "(prefers-color-scheme: dark)" },
      { url: "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png", media: "(prefers-color-scheme: light)" },
    ],
    shortcut: "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png",
    apple: "/images/LuckyLy-Logo-VERDE-SIN-FONDO.png",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors" suppressHydrationWarning>
        <ThemeProvider>
          <Suspense fallback={null}>
            <TutorialProvider>
              <Header />
              {children}
              <SocialFloat />
              <TutorialOverlay />
            </TutorialProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}

