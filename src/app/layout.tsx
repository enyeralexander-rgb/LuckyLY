import "./globals.css";
import type { Metadata } from "next";
import { Fredoka, Oswald } from "next/font/google";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { Header } from "../components/ui/Header";
import { SpeedInsights } from "@vercel/speed-insights/next";

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
    icon: "/images/LuckyLy-Isotipo.png",
    apple: "/images/LuckyLy-Isotipo.png",
    shortcut: "/images/LuckyLy-Isotipo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fredoka.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}

