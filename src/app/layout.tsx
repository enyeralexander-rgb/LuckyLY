import "./globals.css";
import type { Metadata } from "next";
import { Cherry_Bomb_One, Oswald } from "next/font/google";

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
  title: "LuckyLy",
  description: "Plataforma de sorteos con ruleta, recargas y panel administrativo",
  icons: {
    icon: "/images/LuckyLy-Isotipo.png",
    apple: "/images/LuckyLy-Isotipo.png",
    shortcut: "/images/LuckyLy-Isotipo.png"
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${cherryBomb.variable} ${oswald.variable}`}>
      <body>
        {children}
      </body>
    </html>
  );
}

