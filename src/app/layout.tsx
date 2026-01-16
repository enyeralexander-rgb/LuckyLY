import "./globals.css";
import type { Metadata } from "next";
import { Cherry_Bomb_One, Oswald } from "next/font/google";
import { ThemeProvider } from "../components/providers/ThemeProvider";
import { Header } from "../components/ui/Header";

const cherryBomb = Cherry_Bomb_One({ 
  weight: "400",
  subsets: ["latin"],
  variable: "--font-cherry-bomb"
});

const oswald = Oswald({ 
  weight: "700",
  subsets: ["latin"],
  variable: "--font-oswald"
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
    <html lang="es" className={`${cherryBomb.variable} ${oswald.variable}`} suppressHydrationWarning>
      <body className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <Header />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

