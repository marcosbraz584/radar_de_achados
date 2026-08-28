import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Radar de Achados 2.0",
  description: "Ofertas e achados selecionados para você.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
