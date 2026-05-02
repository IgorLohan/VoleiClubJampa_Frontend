import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vôlei Club Jampa",
  description: "Participe. Compita. Supere seus limites."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

