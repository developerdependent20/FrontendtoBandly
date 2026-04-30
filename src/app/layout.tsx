import type { Metadata } from "next";
import { Inter, Outfit, Playfair_Display, Lora, Bodoni_Moda } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import SessionManager from "@/components/SessionManager";
import A11yWidget from "@/components/A11yWidget";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "700"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500", "600"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CLAN | Talento CLAN",
  description: "Ecosistema para el desarrollo integral de jóvenes talentos en el deporte y las artes. Acompañamos a atletas y artistas en la construcción de su futuro.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;700;800&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Inter:wght@300;400;700;900&display=swap" rel="stylesheet" />
        {/* Polyfill required to make HTML5 Drag and Drop work natively on mobile touch screens */}
        <script src="https://bernardo-castilho.github.io/DragDropTouch/DragDropTouch.js" async defer></script>
      </head>
      <body className={`${inter.variable} ${outfit.variable} ${playfair.variable} ${lora.variable} ${bodoni.variable} antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <SessionManager />
          {children}
          <A11yWidget />
        </ThemeProvider>
      </body>
    </html>
  );
}
